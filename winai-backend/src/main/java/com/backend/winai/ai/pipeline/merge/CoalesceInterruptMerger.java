package com.backend.winai.ai.pipeline.merge;

import com.backend.winai.ai.pipeline.config.AiPipelineProperties;
import com.backend.winai.ai.pipeline.model.AiPayload;
import com.backend.winai.ai.pipeline.prompts.AiPipelinePrompts;
import com.backend.winai.ai.pipeline.redis.AiInflightService;
import com.backend.winai.service.OpenAiService;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Reconcilia o "draft" gerado pela IA com mensagens novas do lead que chegaram
 * NO BUFFER REDIS enquanto o GPT estava gerando. Espelha
 * coalesceBufferedUserTurnsDuringGPT + mergeCoalescedInterruptReply do AI Worker.
 *
 * Importante: se alguma das novas mensagens contém mídia, regenera do zero
 * (caller deve chamar o pipeline principal de novo) em vez de mesclar texto.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CoalesceInterruptMerger {

    private static final int HISTORY_MAX_LINES = 18;
    private static final int HISTORY_MAX_RUNES_PER_LINE = 220;

    private final AiPipelineProperties props;
    private final AiInflightService inflight;
    private final OpenAiService openAiService;

    /**
     * Executa o loop de merge. Retorna o draft final (possivelmente mesclado
     * com novas msgs). Em caso de mídia nova, retorna null e {@link Result#regenerate}
     * será true — caller deve reprocessar do zero com a mídia incluída.
     */
    public Result coalesce(String sector,
                           String contact,
                           String initialDraft,
                           List<String> historyLines,
                           boolean transferToHumanRequested) {
        if (initialDraft == null) initialDraft = "";
        String currentDraft = initialDraft;
        boolean transferLatched = transferToHumanRequested;

        int maxIters = Math.max(1, props.getCoalesceMaxIters());
        int tailWaits = Math.max(0, props.getCoalesceTailWaits());
        long tailSleep = Math.max(50L, props.getCoalesceTailSleepMs());

        for (int iter = 0; iter < maxIters; iter++) {
            List<AiPayload> drained = inflight.drainBuffer(sector, contact);
            if (drained.isEmpty()) {
                if (iter == 0) {
                    return Result.ok(currentDraft, transferLatched);
                }
                // tail-waits: aguardar curtos intervalos pegando msgs em trânsito
                boolean got = false;
                for (int w = 0; w < tailWaits; w++) {
                    try {
                        Thread.sleep(tailSleep);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        return Result.ok(currentDraft, transferLatched);
                    }
                    drained = inflight.drainBuffer(sector, contact);
                    if (!drained.isEmpty()) {
                        got = true;
                        break;
                    }
                }
                if (!got) return Result.ok(currentDraft, transferLatched);
            }

            for (AiPayload p : drained) {
                if (p.hasMedia()) {
                    log.info("[coalesce] mídia recebida durante geração — regenerar do zero");
                    return Result.regenerate(drained);
                }
            }

            currentDraft = mergeOnce(currentDraft, drained, historyLines);
            if (currentDraft == null) {
                return Result.ok(initialDraft, transferLatched);
            }
        }
        log.info("[coalesce] atingido maxIters={}", maxIters);
        return Result.ok(currentDraft, transferLatched);
    }

    private String mergeOnce(String currentDraft, List<AiPayload> newPayloads, List<String> historyLines) {
        StringBuilder hist = new StringBuilder();
        if (historyLines != null) {
            int from = Math.max(0, historyLines.size() - HISTORY_MAX_LINES);
            for (int i = from; i < historyLines.size(); i++) {
                String line = historyLines.get(i);
                if (line == null) continue;
                if (line.length() > HISTORY_MAX_RUNES_PER_LINE) {
                    line = line.substring(0, HISTORY_MAX_RUNES_PER_LINE) + "…";
                }
                hist.append(line.replace("\n", " ").trim()).append('\n');
            }
        }

        StringBuilder newLines = new StringBuilder();
        for (AiPayload p : newPayloads) {
            if (p.hasText()) {
                newLines.append(p.getMessageText().trim()).append('\n');
            }
        }

        StringBuilder user = new StringBuilder();
        user.append("HISTORICO_RECENTE:\n").append(hist).append('\n');
        user.append("DRAFT:\n").append(currentDraft == null ? "" : currentDraft.trim()).append("\n\n");
        user.append("NOVAS_LINHAS:\n").append(newLines).append('\n');
        user.append("Devolva apenas a mensagem final.");

        try {
            String merged = openAiService.generateResponseWithModel(
                    props.getMergeModel(),
                    AiPipelinePrompts.COALESCE_INTERRUPT_MERGE,
                    user.toString());
            if (merged == null || merged.isBlank()) {
                return currentDraft;
            }
            return merged.trim();
        } catch (Exception e) {
            log.warn("[coalesce] merge agent falhou: {} — mantendo draft", e.getMessage());
            return currentDraft;
        }
    }

    /** Resultado do merge. */
    public static final class Result {
        public final String finalText;
        public final boolean transferToHuman;
        public final boolean regenerate;
        public final List<AiPayload> regenPayloads;

        private Result(String t, boolean transfer, boolean regen, List<AiPayload> regenPayloads) {
            this.finalText = t;
            this.transferToHuman = transfer;
            this.regenerate = regen;
            this.regenPayloads = regenPayloads;
        }

        public static Result ok(String text, boolean transfer) {
            return new Result(text, transfer, false, null);
        }

        public static Result regenerate(List<AiPayload> payloads) {
            return new Result(null, false, true, new ArrayList<>(payloads));
        }
    }
}
