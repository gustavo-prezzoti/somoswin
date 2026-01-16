package com.backend.winai.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class UazapWebhookRequest {

    @JsonProperty("EventType")
    private String EventType; // "messages"

    @JsonProperty("BaseUrl")
    private String BaseUrl;

    private String token;
    private String instanceName;
    private String owner;

    private ChatData chat;
    private MessageData message;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ChatData {
        private String id;
        private String wa_chatid;
        private String wa_fastid;
        private String phone;
        private String name;
        private String wa_name;
        private Boolean wa_isGroup;
        private Integer wa_unreadCount;
        private Long wa_lastMsgTimestamp;
        private String wa_lastMessageText;
        private String lead_fullName;
        private String lead_email;
        private String lead_status;
        private String lead_personalid;
        private String image;
        private String imagePreview;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class MessageData {
        private String id;
        private String messageid;
        private String chatid;
        private String sender_pn;
        private String senderName;
        private Object text;
        private Object content;
        private String type;
        private String messageType;
        private String mediaType;
        private Long messageTimestamp;
        private Boolean fromMe;
        private Boolean wasSentByApi;
        private Boolean isGroup;
        private String owner;
    }
}
