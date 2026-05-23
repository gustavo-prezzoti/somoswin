package com.backend.winai.ai.pipeline.filters;

import com.backend.winai.ai.pipeline.config.AiPipelineProperties;
import com.backend.winai.ai.pipeline.model.AiPayload;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Descarta mensagens muito antigas. Evita responder leads que mandaram
 * mensagem horas atrás quando a fila/sistema fica atrasado e processa
 * entregas antigas.
 *
 * Duas camadas:
 *  - Publisher: timestamp do WhatsApp > 5 min → NÃO enfileira.
 *  - Consumer: enqueuedAt > 5 min OU wa timestamp > 5 min → descarta.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StalenessFilter {

    private final AiPipelineProperties props;

    /** @return true se a mensagem deve ser enfileirada. False se for stale. */
    public boolean isFreshForEnqueue(AiPayload payload) {
        if (payload == null) return false;
        Long waTs = payload.getWhatsAppTimestamp();
        if (waTs != null) {
            long age = System.currentTimeMillis() - waTs;
            if (age > props.getPublisherStaleMs()) {
                log.info("[stale] descartando enqueue: wa msg {}ms ({} min) wa_id={}",
                        age, age / 60_000, payload.getWaMessageId());
                return false;
            }
        }
        return true;
    }

    /** @return true se a mensagem ainda vale processar. False se for stale. */
    public boolean isFreshForConsume(AiPayload payload) {
        if (payload == null) return false;
        long now = System.currentTimeMillis();
        long limit = props.getConsumerStaleMs();

        Long enqueuedAt = payload.getEnqueuedAt();
        if (enqueuedAt != null && (now - enqueuedAt) > limit) {
            log.info("[stale] descartando consume (enqueued há {}ms) wa_id={}",
                    now - enqueuedAt, payload.getWaMessageId());
            return false;
        }
        Long waTs = payload.getWhatsAppTimestamp();
        if (waTs != null && (now - waTs) > limit) {
            log.info("[stale] descartando consume (wa há {}ms) wa_id={}",
                    now - waTs, payload.getWaMessageId());
            return false;
        }
        return true;
    }
}
