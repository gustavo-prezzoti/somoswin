package com.backend.winai.queue;

import com.backend.winai.ai.pipeline.AiPipelineService;
import com.backend.winai.ai.pipeline.model.AiPayload;
import com.backend.winai.dto.queue.AiQueueMessage;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Fina camada de adaptação entre o webhook (que constrói {@link AiQueueMessage})
 * e o novo {@link AiPipelineService}. As regras de fila/agregação/dedupe
 * agora vivem no pipeline modular.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AiResponseProducer {

    private final AiPipelineService pipeline;

    /**
     * @return true se a mensagem foi aceita (enfileirada ou bufferizada).
     */
    public boolean sendMessage(AiQueueMessage message) {
        if (message == null) return false;
        try {
            AiPayload payload = new AiPayload();
            payload.setConversationId(message.getConversationId());
            payload.setCompanyId(message.getCompanyId());
            payload.setLeadName(message.getLeadName());
            payload.setMessageText(message.getUserMessage());
            payload.setMediaUrl(message.getImageUrl());
            payload.setWaMessageId(message.getWaMessageId());
            String mt = message.getMediaType();
            if ((mt == null || mt.isBlank()) && message.getImageUrl() != null && !message.getImageUrl().isBlank()) {
                mt = "image";
            }
            payload.setMediaType(mt);
            payload.setWhatsAppTimestamp(
                    message.getWhatsAppTimestamp() != null ? message.getWhatsAppTimestamp() : message.getTimestamp());
            return pipeline.enqueueIncoming(payload);
        } catch (Exception e) {
            log.error("Erro ao entregar mensagem ao pipeline IA: {}", e.getMessage(), e);
            return false;
        }
    }
}
