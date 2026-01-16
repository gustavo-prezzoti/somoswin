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
public class NotificationResponse {
    private UUID id;
    private String title;
    private String message;
    private Boolean read;
    private String type;
    private String relatedEntityType;
    private UUID relatedEntityId;
    private String actionUrl;
    private ZonedDateTime createdAt;
}

