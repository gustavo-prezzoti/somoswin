package com.backend.winai.ai.pipeline;

import com.backend.winai.ai.pipeline.aggregator.LeadReplyAggregator;
import com.backend.winai.ai.pipeline.config.AiPipelineProperties;
import com.backend.winai.ai.pipeline.decisor.WaitRespondDecisor;
import com.backend.winai.ai.pipeline.filters.AiCooldownService;
import com.backend.winai.ai.pipeline.filters.StalenessFilter;
import com.backend.winai.ai.pipeline.merge.CoalesceInterruptMerger;
import com.backend.winai.ai.pipeline.model.AiPayload;
import com.backend.winai.ai.pipeline.model.PayloadMerger;
import com.backend.winai.ai.pipeline.redis.AiInflightService;
import com.backend.winai.service.AIAgentService;
import com.backend.winai.service.OpenAiService;

import jakarta.annotation.PostConstruct;

import org.springframework.beans.factory.DisposableBean;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Orquestrador único do pipeline IA. É o ponto de entrada chamado pelo webhook
 * (e pelo producer legado). Mantém juntas as regras descritas em
 * REGRAS DE NEGÓCIO — RESPOSTA DE MENSAGENS DA IA AOS LEADS.
 *
 * Fluxo de uma mensagem entrante:
 *  (1)  Stale cutoff publisher (timestamp WhatsApp > 5min → descarta).
 *  (2)  Dedupe distribuído por wa_message_id (publisher).
 *  (3)  SETNX inflight em {@code winai:ai:inflight:v1:{company}:{conv}}:
 *         - já existe → RPUSH no buffer e retorna.
 *         - sucesso → segue.
 *  (4)  Decisor de espera (gpt-4o-mini) calcula waitSeconds.
 *  (5)  Aggregator agenda flush com reset (hard-cap absoluto).
 *  (6)  Flush → mergePayloads → processMerged():
 *        - stale (consumer)
 *        - dedupe processedWa
 *        - cooldown distribuído + local (se ativo, re-bufferiza, não descarta)
 *        - delega AIAgentService (intent + KB + GPT + sendSplit + persist)
 *        - durante geração: CoalesceInterruptMerger mescla mensagens novas
 *        - release inflight + drain buffer
 *        - se buffer não vazio: loop com payloads mesclados
 *
 * Princípio: NUNCA descartar mensagem do lead — só agregar/coalescer.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiPipelineService implements DisposableBean {

    private final AiPipelineProperties props;
    private final AiInflightService inflight;
    private final LeadReplyAggregator aggregator;
    private final WaitRespondDecisor decisor;
    private final StalenessFilter staleness;
    private final AiCooldownService cooldown;
    private final CoalesceInterruptMerger coalescer;
    private final OpenAiService openAiService;
    private final AIAgentService aiAgentService;

    /** Pool dedicado para executar a fase pesada (GPT + uazap) sem bloquear o aggregator. */
    private final ExecutorService workerPool = Executors.newFixedThreadPool(
            Math.max(4, Runtime.getRuntime().availableProcessors()),
            r -> {
                Thread t = new Thread(r, "ai-pipeline-worker");
                t.setDaemon(true);
                return t;
            });

    @PostConstruct
    void init() {
        aggregator.setOnFlush(merged -> workerPool.submit(() -> processMerged(merged)));
        log.info("AiPipelineService inicializado (enabled={}, wait=[{},{}]s, floor={}s, hardCap={}s)",
                props.isEnabled(), props.minWaitSec(), props.maxWaitSec(),
                props.floorWaitSec(), props.hardCapSec());
    }

    /**
     * Entrada do pipeline (chamada pelo webhook). Não bloqueia.
     * @return true se a mensagem foi aceita (enfileirada/processando), false se descartada.
     */
    public boolean enqueueIncoming(AiPayload payload) {
        if (payload == null || payload.getConversationId() == null || payload.getCompanyId() == null) {
            log.warn("Payload inválido (sem conversationId/companyId), ignorando");
            return false;
        }
        if (!props.isEnabled()) {
            log.debug("Pipeline desativado por config, processando direto");
            workerPool.submit(() -> runImmediate(payload));
            return true;
        }

        // (1) Stale publisher
        if (!staleness.isFreshForEnqueue(payload)) {
            return false;
        }
        // (2) Dedup publisher por wa_message_id
        if (!inflight.tryClaimEnqueueWa(payload.getCompanyId(), payload.getWaMessageId())) {
            log.info("[pipeline] wa_msg_id duplicado no enqueue: {}", payload.getWaMessageId());
            return false;
        }
        // (3) SETNX inflight: se ocupado → buffer
        boolean claimed = inflight.tryClaimInflight(payload.getCompanyId(), payload.getConversationId());
        if (!claimed) {
            inflight.pushBuffer(payload.getCompanyId(), payload.getConversationId(), payload);
            log.info("[pipeline] inflight ocupado, payload bufferizado conv={}", payload.getConversationId());
            return true;
        }

        // (4) Decisor de espera
        List<String> history = recentHistoryLines(payload);
        int waitSec = decisor.decideWaitSeconds(payload, history);

        // (5) Aggregator (com flush callback registrado em init)
        aggregator.offer(payload, waitSec);
        return true;
    }

    /** Quando o pipeline está desligado, processa direto sem aggregator/decisor. */
    private void runImmediate(AiPayload payload) {
        try {
            invokeAgent(payload);
        } catch (Exception e) {
            log.error("[pipeline] runImmediate erro: {}", e.getMessage(), e);
        }
    }

    /**
     * Executado a cada flush do aggregator. Roda o ciclo completo até esvaziar
     * o buffer Redis.
     */
    void processMerged(AiPayload mergedInitial) {
        AiPayload current = mergedInitial;
        int loopGuard = 0;

        while (current != null && loopGuard++ < 8) {
            // (6.1) Stale consumer
            if (!staleness.isFreshForConsume(current)) {
                break;
            }
            // (6.2) Dedup processed_wa
            if (!inflight.tryClaimProcessedWa(current.getCompanyId(), current.getWaMessageId())) {
                log.info("[pipeline] wa_msg_id já processado por outra réplica: {}", current.getWaMessageId());
                break;
            }

            // (6.3) Cooldown distribuído (entre réplicas)
            String contactKey = current.getCompanyId() + ":" + current.getConversationId();
            if (!inflight.tryRegisterOutboundCooldown(current.getCompanyId(),
                    current.getConversationId(), props.getReplyCooldownMs())) {
                log.info("[pipeline] cooldown distribuído ativo, agregando ao buffer");
                inflight.pushBuffer(current.getCompanyId(), current.getConversationId(), current);
                break;
            }
            // (6.4) Cooldown em memória local — se ativo, re-bufferiza
            if (!cooldown.tryConsume(contactKey)) {
                log.info("[pipeline] cooldown local ativo, agregando ao buffer");
                inflight.pushBuffer(current.getCompanyId(), current.getConversationId(), current);
                break;
            }

            // (6.5) AIAgentService faz geração + envio + persistência
            invokeAgent(current);

            // (6.6) Coalesce-interrupt: o agente já enviou, mas durante a geração
            //  podem ter chegado msgs novas no buffer. Drenamos para mostrar uma
            //  segunda resposta unificada (não N).
            List<AiPayload> drained = inflight.drainBuffer(
                    current.getCompanyId(), current.getConversationId());
            if (drained.isEmpty()) {
                break;
            }
            AiPayload nextMerged = PayloadMerger.merge(drained);
            log.info("[pipeline] buffer post-publish drenado ({} payloads), iterando", drained.size());
            current = nextMerged;
        }

        // (6.8) Release inflight sempre
        inflight.releaseInflightAndDrain(mergedInitial.getCompanyId(), mergedInitial.getConversationId());
    }

    private void invokeAgent(AiPayload payload) {
        try {
            UUID convId = UUID.fromString(payload.getConversationId());
            // O AIAgentService cuida de: intent classifier → HANDOFF, KB lookup,
            //  GPT, [SUMMARY], ATTACH_DOC, sendSplitResponse, persistAndNotify,
            //  re-check AIActive, follow-up update, lead memory.
            aiAgentService.runFromPipeline(
                    convId,
                    payload.getLeadName(),
                    payload.getMediaUrl(),
                    draft -> {
                        // Hook: durante a geração mesclar com mensagens novas
                        // que chegaram no buffer Redis.
                        try {
                            CoalesceInterruptMerger.Result r = coalescer.coalesce(
                                    payload.getCompanyId(),
                                    payload.getConversationId(),
                                    draft,
                                    historyAsLines(convId),
                                    draft != null && draft.contains("[TRANSFER_TO_HUMAN]"));
                            if (r.regenerate) {
                                // Sinal de regenerar do zero — devolvemos null para
                                //  o agente abortar; o loop processMerged() reprocessará.
                                return null;
                            }
                            return r.finalText != null ? r.finalText : draft;
                        } catch (Exception e) {
                            log.warn("[pipeline] coalesce-interrupt falhou: {}", e.getMessage());
                            return draft;
                        }
                    });
        } catch (IllegalArgumentException e) {
            log.warn("conversationId inválido: {}", payload.getConversationId());
        } catch (Exception e) {
            log.error("Erro invocando AIAgentService: {}", e.getMessage(), e);
        }
    }

    private List<String> recentHistoryLines(AiPayload payload) {
        try {
            UUID convId = UUID.fromString(payload.getConversationId());
            return historyAsLines(convId);
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private List<String> historyAsLines(UUID convId) {
        try {
            List<OpenAiService.ChatMessage> hist = aiAgentService.getRecentConversationHistory(
                    convId, props.getDecisorHistoryCount());
            List<String> out = new ArrayList<>(hist.size());
            for (OpenAiService.ChatMessage m : hist) {
                if (m == null || m.getContent() == null) continue;
                out.add(m.getRole() + ": " + m.getContent());
            }
            return out;
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    @Override
    public void destroy() {
        workerPool.shutdown();
        try {
            if (!workerPool.awaitTermination(5, TimeUnit.SECONDS)) {
                workerPool.shutdownNow();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
