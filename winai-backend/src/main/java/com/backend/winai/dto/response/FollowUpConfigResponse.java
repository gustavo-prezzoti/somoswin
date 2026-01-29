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
public class FollowUpConfigResponse {

    private UUID id;
    private UUID companyId;
    private String companyName;
    private Boolean enabled;
    private Integer inactivityMinutes;
    private Boolean recurring;
    private Integer recurrenceMinutes;
    private Integer maxFollowUps;
    private String messageType;
    private String customMessage;
    private Boolean triggerOnLeadMessage;
    private Boolean triggerOnAiResponse;
    private Integer startHour;
    private Integer endHour;

    // Handoff Humano
    private Boolean humanHandoffNotificationEnabled;
    private String humanHandoffPhone;
    private String humanHandoffMessage;

    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;
}
