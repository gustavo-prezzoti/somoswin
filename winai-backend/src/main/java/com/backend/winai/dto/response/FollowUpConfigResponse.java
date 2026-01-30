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
    private Boolean triggerOnLeadMessage;
    private Boolean triggerOnAiResponse;
    private Integer startHour;
    private Integer endHour;
    private java.util.List<FollowUpStepResponse> steps;

    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;
}
