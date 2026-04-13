package com.backend.winai.dto.whatsapp.broadcast;

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
public class WhatsAppBroadcastCampaignResponse {

    private UUID id;
    private String name;
    private String status;
    private String messageText;
    private String imageUrl;
    private String videoUrl;
    private int totalRecipients;
    private int sentCount;
    private int failedCount;
    private Integer progressPercent;
    private ZonedDateTime createdAt;
    private ZonedDateTime startedAt;
    private ZonedDateTime completedAt;
    private List<WhatsAppBroadcastRecipientResponse> reports;
}
