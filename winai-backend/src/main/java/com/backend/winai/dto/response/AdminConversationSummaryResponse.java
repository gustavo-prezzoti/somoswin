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
public class AdminConversationSummaryResponse {

    private UUID id;
    private UUID companyId;
    private String companyName;
    private UUID leadId;
    private String leadName;
    private String phoneNumber;
    private String contactName;
    private String lastMessageText;
    private Long lastMessageTimestamp;
    private Integer unreadCount;
    private String profilePictureUrl;
    private String uazapInstance;
}
