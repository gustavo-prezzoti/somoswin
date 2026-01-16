package com.backend.winai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WhatsAppConversationResponse {

    private UUID id;
    private UUID companyId;
    private UUID leadId;
    private String phoneNumber;
    private String waChatId;
    private String contactName;
    private String profilePictureUrl;
    private Integer unreadCount;
    private String lastMessageText;
    private Long lastMessageTimestamp;
    private Boolean isArchived;
    private Boolean isBlocked;
    private String uazapInstance;
    private String supportMode; // IA ou HUMAN
    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;

    // Últimas mensagens (opcional)
    private List<WhatsAppMessageResponse> recentMessages;
}
