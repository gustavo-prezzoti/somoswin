package com.backend.winai.ai.pipeline.handoff;

import com.backend.winai.ai.pipeline.config.AiPipelineProperties;
import com.backend.winai.service.OpenAiService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class HandoffReversionClassifier {

    public enum Decision { REVERT, STAY, AMBIGUOUS }

    private static final long TIMEOUT_MS = 4_000L;
    private static final int HISTORY_CAP = 12;
    private static final int LINE_RUNES_CAP = 240;

    private static final String SYSTEM_PROMPT = String.join("\n",
            "Você é um classificador binário sobre intenção de atendimento humano.",
            "Contexto: o lead pediu (em algum momento do histórico) para falar com um humano,",
            "e por isso a conversa entrou em modo HUMANO. Agora chegou UMA NOVA MENSAGEM.",
            "Nenhum humano respondeu ainda.",
            "",
            "Tarefa: decidir se o lead AINDA quer falar com um humano ou se MUDOU DE ASSUNTO",
            "e está fazendo uma nova pergunta que a IA pode responder (catálogo, preço, dúvida",
            "do produto, agendamento, etc).",
            "",
            "RESPONDA UMA ÚNICA PALAVRA:",
            "  REVERT     — lead claramente mudou de assunto e quer resposta agora (IA volta).",
            "  STAY       — lead reafirmou pedido de humano, ou continua aguardando o atendente.",
            "  AMBIGUOUS  — não dá pra dizer com segurança (default seguro = continuar humano).",
            "",
            "Regras:",
            "  - Se a nova mensagem é uma pergunta concreta sobre produto/serviço/preço/horário",
            "    e NÃO menciona humano/atendente/pessoa → REVERT.",
            "  - Se a nova mensagem é cumprimento curto (\"oi\", \"olá\") seguido de pergunta",
            "    concreta → REVERT.",
            "  - Se a nova mensagem reitera pedido de humano (\"ainda quero atendente\", \"e o humano?\")",
            "    → STAY.",
            "  - Se a mensagem só agradece, se despede, ou é vaga → AMBIGUOUS.",
            "  - Se NÃO há pedido de humano no histórico → AMBIGUOUS (decisor errado foi chamado).",
            "",
            "Não explique. Não use JSON. Apenas REVERT, STAY ou AMBIGUOUS."
    );

    private final AiPipelineProperties props;
    private final OpenAiService openAiService;
    private final ExecutorService executor = Executors.newCachedThreadPool(r -> {
        Thread t = new Thread(r, "ai-handoff-reversion");
        t.setDaemon(true);
        return t;
    });

    public Decision classify(List<OpenAiService.ChatMessage> recentHistory, String currentMessage) {
        if (currentMessage == null || currentMessage.isBlank()) {
            return Decision.AMBIGUOUS;
        }
        try {
            return executor.submit(() -> callModel(recentHistory, currentMessage))
                    .get(TIMEOUT_MS, TimeUnit.MILLISECONDS);
        } catch (Exception e) {
            log.debug("HandoffReversionClassifier: erro/timeout ({}). Mantendo HUMAN.", e.getClass().getSimpleName());
            return Decision.AMBIGUOUS;
        }
    }

    private Decision callModel(List<OpenAiService.ChatMessage> recentHistory, String currentMessage) {
        StringBuilder user = new StringBuilder();
        user.append("HISTORICO_RECENTE:\n");
        if (recentHistory != null && !recentHistory.isEmpty()) {
            int from = Math.max(0, recentHistory.size() - HISTORY_CAP);
            for (int i = from; i < recentHistory.size(); i++) {
                OpenAiService.ChatMessage m = recentHistory.get(i);
                if (m == null || m.getContent() == null) continue;
                String line = m.getContent().replace("\n", " ").trim();
                if (line.length() > LINE_RUNES_CAP) {
                    line = line.substring(0, LINE_RUNES_CAP) + "…";
                }
                user.append(m.getRole()).append(": ").append(line).append('\n');
            }
        } else {
            user.append("(vazio)\n");
        }
        user.append("\nMENSAGEM_ATUAL: ").append(currentMessage.trim()).append('\n');
        user.append("Responda apenas REVERT, STAY ou AMBIGUOUS.");

        String raw;
        try {
            raw = openAiService.generateResponseWithModel(
                    props.getMergeModel(),
                    SYSTEM_PROMPT,
                    user.toString());
        } catch (Exception e) {
            log.debug("HandoffReversionClassifier: OpenAI erro: {}", e.getMessage());
            return Decision.AMBIGUOUS;
        }
        return parse(raw);
    }

    static Decision parse(String raw) {
        if (raw == null) return Decision.AMBIGUOUS;
        String s = raw.trim().toUpperCase();
        if (s.isEmpty()) return Decision.AMBIGUOUS;
        if (s.startsWith("REVERT")) return Decision.REVERT;
        if (s.startsWith("STAY")) return Decision.STAY;
        if (s.startsWith("AMBIG")) return Decision.AMBIGUOUS;
        if (s.contains("REVERT")) return Decision.REVERT;
        if (s.contains("STAY")) return Decision.STAY;
        return Decision.AMBIGUOUS;
    }
}
