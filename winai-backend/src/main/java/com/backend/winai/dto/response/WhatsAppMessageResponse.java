package com.backend.winai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WhatsAppMessageResponse {

    private UUID id;
    private String messageId; // ID do WhatsApp
    private String content;
    private Boolean fromMe;
    private String messageType; // text, audio, image, video, document, etc.
    private String mediaType;
    private String mediaUrl;
    private Integer mediaDuration;
    private Long messageTimestamp;
    private String status; // sent, delivered, read, failed
    private Boolean isGroup;
    private String quotedMessageId;
    private String transcription;
    private ZonedDateTime createdAt;

    // Informações da conversa
    private UUID conversationId;
    private UUID leadId;
    private String phoneNumber;
    private String contactName;
}
