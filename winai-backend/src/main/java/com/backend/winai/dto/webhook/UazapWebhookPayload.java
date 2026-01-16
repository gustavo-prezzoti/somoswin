package com.backend.winai.dto.webhook;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UazapWebhookPayload {

    private String event;
    private String instance;
    private MessageData data;
    private String owner;
    private String token;
    private String webhookUrl;
    private String executionMode;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MessageData {
        private String convertOptions;
        private String edited;
        private Boolean fromMe;
        private String groupName;
        private String id;
        private Boolean isGroup;
        private String mediaType;
        private Long messageTimestamp;
        private String messageType;
        private String messageid;
        private String owner;
        private String quoted;
        private String reaction;
        private String sender;
        private String senderName;

        @JsonProperty("sender_lid")
        private String senderLid;

        @JsonProperty("sender_pn")
        private String senderPn;

        private String source;
        private String status;
        private String text;

        @JsonProperty("track_id")
        private String trackId;

        @JsonProperty("track_source")
        private String trackSource;

        private String type;
        private String vote;
        private Boolean wasSentByApi;

        // Para mensagens de mídia
        private String caption;
        private String mimetype;
        private String filename;
        private String url;
        private MediaData media;

        // Contexto (mensagem citada)
        private ContextData contextInfo;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MediaData {
        private String url;
        private String mimetype;
        private String filename;
        private Long filesize;
        private String caption;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ContextData {
        private String quotedMessageId;
        private String quotedMessage;
        private String participant;
    }
}
