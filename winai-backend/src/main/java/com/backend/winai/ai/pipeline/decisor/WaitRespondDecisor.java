package com.backend.winai.ai.pipeline.decisor;

import com.backend.winai.ai.pipeline.config.AiPipelineProperties;
import com.backend.winai.ai.pipeline.model.AiPayload;
import com.backend.winai.ai.pipeline.prompts.AiPipelinePrompts;
import com.backend.winai.service.OpenAiService;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.TimeUnit;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Decide quantos segundos esperar por mais mensagens antes de processar.
 *
 * Pipeline:
 *  - Mensagem com mídia OU texto vazio: waitSeconds = 0 (processa já).
 *  - Texto: chama um modelo barato (gpt-4o-mini) que retorna 0.0..1.0.
 *  - Converte score em segundos: seconds = MAX - score * (MAX - MIN).
 *  - Aplica piso AGGREGATOR_FLOOR_WAIT_SEC.
 *  - Em erro/timeout: retorna 0 (responde já).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WaitRespondDecisor {

    private static final long DECISOR_TIMEOUT_MS = 4_000L;

    private final AiPipelineProperties props;
    private final OpenAiService openAiService;
    private final java.util.concurrent.ExecutorService executor = java.util.concurrent.Executors
            .newCachedThreadPool(r -> {
                Thread t = new Thread(r, "ai-decisor");
                t.setDaemon(true);
                return t;
            });

    /**
     * @param payload  mensagem recém-recebida
     * @param history  histórico recente (string formatada role: texto)
     * @return segundos a esperar antes do flush
     */
    public int decideWaitSeconds(AiPayload payload, List<String> history) {
        if (payload == null) return 0;
        if (payload.hasMedia()) return 0;
        if (!payload.hasText()) return 0;

        double score = callDecisorWithTimeout(payload, history);
        if (Double.isNaN(score)) {
            return 0;
        }
        int min = props.minWaitSec();
        int max = props.maxWaitSec();
        int floor = props.floorWaitSec();

        double clamped = Math.min(1.0, Math.max(0.0, score));
        double seconds = max - clamped * (max - min);
        int rounded = (int) Math.round(seconds);
        if (rounded < floor) rounded = floor;
        if (rounded > max) rounded = max;
        return rounded;
    }

    private double callDecisorWithTimeout(AiPayload payload, List<String> history) {
        try {
            return executor.submit(() -> callDecisor(payload, history))
                    .get(DECISOR_TIMEOUT_MS, TimeUnit.MILLISECONDS);
        } catch (Exception e) {
            log.debug("Decisor falhou ({}). Respondendo já.", e.getClass().getSimpleName());
            return Double.NaN;
        }
    }

    private double callDecisor(AiPayload payload, List<String> history) {
        StringBuilder user = new StringBuilder();
        if (history != null && !history.isEmpty()) {
            user.append("HISTORICO_RECENTE:\n");
            int limit = Math.min(history.size(), props.getDecisorHistoryCount());
            for (int i = history.size() - limit; i < history.size(); i++) {
                String line = history.get(i);
                if (line == null) continue;
                user.append(line.replace("\n", " ").trim()).append('\n');
            }
        }
        user.append("MENSAGEM_ATUAL: ").append(payload.getMessageText().trim()).append('\n');
        user.append("Responda apenas o número decimal.");

        String raw;
        try {
            raw = openAiService.generateResponseWithModel(
                    props.getDecisorModel(),
                    AiPipelinePrompts.WAIT_OR_RESPOND_DECISOR,
                    user.toString());
        } catch (Exception e) {
            log.debug("Decisor: erro chamando OpenAI: {}", e.getMessage());
            return Double.NaN;
        }
        return parseScore(raw);
    }

    static double parseScore(String raw) {
        if (raw == null) return Double.NaN;
        String s = raw.trim();
        if (s.isEmpty()) return Double.NaN;
        s = s.replaceAll("[^0-9.,\\-]", "").replace(',', '.');
        int firstDot = s.indexOf('.');
        if (firstDot >= 0) {
            int next = s.indexOf('.', firstDot + 1);
            if (next > 0) {
                s = s.substring(0, next);
            }
        }
        if (s.isEmpty() || s.equals("-") || s.equals(".")) return Double.NaN;
        try {
            return Double.parseDouble(s);
        } catch (NumberFormatException e) {
            return Double.NaN;
        }
    }
}
