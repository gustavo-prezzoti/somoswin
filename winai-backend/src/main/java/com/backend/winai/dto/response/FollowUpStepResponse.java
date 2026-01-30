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
public class FollowUpStepResponse {
    private UUID id;
    private Integer stepOrder;
    private Integer delayMinutes;
    private String messageType;
    private String customMessage;
    private String aiPrompt;
    private Boolean active;
}
