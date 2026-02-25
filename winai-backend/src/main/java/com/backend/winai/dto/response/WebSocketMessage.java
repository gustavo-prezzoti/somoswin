package com.backend.winai.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class WebSocketMessage {
    private String type; // "NEW_MESSAGE", "NEW_CONVERSATION", "MESSAGE_UPDATED", "CONVERSATION_UPDATED"
    private WhatsAppMessageResponse message;
    private WhatsAppConversationResponse conversation;
    @JsonSerialize(using = ToStringSerializer.class)
    private UUID companyId;
    private String conversationId;
    private String mode;
}
