package com.backend.winai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebSocketMessage {
    private String type; // "NEW_MESSAGE", "NEW_CONVERSATION", "MESSAGE_UPDATED", "CONVERSATION_UPDATED"
    private WhatsAppMessageResponse message;
    private WhatsAppConversationResponse conversation;
    private UUID companyId;
    private String conversationId;
    private String mode;
}
