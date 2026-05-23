package com.backend.winai.ai.pipeline.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.io.Serializable;

/**
 * Payload canônico que trafega pelo pipeline da IA: entrada da fila, buffer
 * Redis e agregador. Inclui campos suficientes para deduplicação (waMessageId)
 * e para o decisor de espera (mediaType/mediaUrl).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiPayload implements Serializable {

    private String conversationId;
    private String companyId;
    private String waMessageId;
    private String leadName;
    private String messageText;
    /** text|audio|image|video|document|sticker */
    private String mediaType;
    private String mediaUrl;
    /** Timestamp da mensagem no WhatsApp (ms). */
    private Long whatsAppTimestamp;
    /** Quando entrou na fila do nosso lado (ms). Default = now. */
    private Long enqueuedAt;

    public AiPayload() {
        this.enqueuedAt = System.currentTimeMillis();
    }

    public boolean hasMedia() {
        if (mediaType == null) {
            return mediaUrl != null && !mediaUrl.isBlank();
        }
        String t = mediaType.toLowerCase();
        return t.contains("audio") || t.contains("image") || t.contains("video")
                || t.contains("document") || t.contains("sticker") || t.contains("ptt");
    }

    public boolean hasText() {
        return messageText != null && !messageText.trim().isEmpty();
    }

    // ----------- getters/setters -----------

    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }

    public String getCompanyId() { return companyId; }
    public void setCompanyId(String companyId) { this.companyId = companyId; }

    public String getWaMessageId() { return waMessageId; }
    public void setWaMessageId(String waMessageId) { this.waMessageId = waMessageId; }

    public String getLeadName() { return leadName; }
    public void setLeadName(String leadName) { this.leadName = leadName; }

    public String getMessageText() { return messageText; }
    public void setMessageText(String messageText) { this.messageText = messageText; }

    public String getMediaType() { return mediaType; }
    public void setMediaType(String mediaType) { this.mediaType = mediaType; }

    public String getMediaUrl() { return mediaUrl; }
    public void setMediaUrl(String mediaUrl) { this.mediaUrl = mediaUrl; }

    public Long getWhatsAppTimestamp() { return whatsAppTimestamp; }
    public void setWhatsAppTimestamp(Long whatsAppTimestamp) { this.whatsAppTimestamp = whatsAppTimestamp; }

    public Long getEnqueuedAt() { return enqueuedAt; }
    public void setEnqueuedAt(Long enqueuedAt) { this.enqueuedAt = enqueuedAt; }
}
