package com.backend.winai.ai.pipeline.model;

import java.util.List;

/**
 * Junta N {@link AiPayload}s do mesmo burst em UMA mensagem unificada.
 *
 * Regra (espelha MergeAIPayloads do AI Worker original):
 *  - MessageText = concatenação dos textos com "\n" entre eles.
 *  - WaMessageId = ID da PRIMEIRA mensagem (preservado para dedupe externo).
 *  - WhatsAppTimestamp = timestamp da MAIS RECENTE.
 *  - EnqueuedAt = mais ANTIGO (idade verdadeira do burst).
 *  - mediaType/mediaUrl: prioriza a primeira mensagem com mídia (não-texto).
 */
public final class PayloadMerger {

    private PayloadMerger() {}

    public static AiPayload merge(List<AiPayload> payloads) {
        if (payloads == null || payloads.isEmpty()) {
            return null;
        }
        if (payloads.size() == 1) {
            return payloads.get(0);
        }

        AiPayload first = payloads.get(0);
        AiPayload out = new AiPayload();
        out.setConversationId(first.getConversationId());
        out.setCompanyId(first.getCompanyId());
        out.setWaMessageId(first.getWaMessageId());
        out.setLeadName(first.getLeadName());

        StringBuilder sb = new StringBuilder();
        long minEnqueued = Long.MAX_VALUE;
        long maxWaTs = Long.MIN_VALUE;
        String mediaType = null;
        String mediaUrl = null;
        String leadName = first.getLeadName();

        for (AiPayload p : payloads) {
            if (p == null) continue;
            if (p.hasText()) {
                if (sb.length() > 0) sb.append('\n');
                sb.append(p.getMessageText().trim());
            }
            if (p.getEnqueuedAt() != null && p.getEnqueuedAt() < minEnqueued) {
                minEnqueued = p.getEnqueuedAt();
            }
            if (p.getWhatsAppTimestamp() != null && p.getWhatsAppTimestamp() > maxWaTs) {
                maxWaTs = p.getWhatsAppTimestamp();
            }
            if (mediaType == null && p.hasMedia()) {
                mediaType = p.getMediaType();
                mediaUrl = p.getMediaUrl();
            }
            if (leadName == null || leadName.isBlank()) {
                leadName = p.getLeadName();
            }
        }

        out.setMessageText(sb.toString());
        out.setLeadName(leadName);
        out.setMediaType(mediaType);
        out.setMediaUrl(mediaUrl);
        out.setEnqueuedAt(minEnqueued == Long.MAX_VALUE ? System.currentTimeMillis() : minEnqueued);
        out.setWhatsAppTimestamp(maxWaTs == Long.MIN_VALUE ? null : maxWaTs);
        return out;
    }
}
