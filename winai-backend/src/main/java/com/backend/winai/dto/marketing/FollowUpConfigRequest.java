package com.backend.winai.dto.marketing;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class FollowUpConfigRequest {
    private UUID companyId;
    private Boolean enabled;
    private Integer inactivityMinutes;
    private Boolean triggerOnLeadMessage;
    private Boolean triggerOnAiResponse;
    private Integer startHour;
    private Integer endHour;
    private List<FollowUpStepRequest> steps;
}
