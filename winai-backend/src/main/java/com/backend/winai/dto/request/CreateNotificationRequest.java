package com.backend.winai.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateNotificationRequest {
    private UUID userId;
    private String title;
    private String message;
    private String type; // INFO, SUCCESS, WARNING, ERROR
    private String relatedEntityType; // MEETING, LEAD, CAMPAIGN, etc.
    private UUID relatedEntityId;
    private String actionUrl;
}

