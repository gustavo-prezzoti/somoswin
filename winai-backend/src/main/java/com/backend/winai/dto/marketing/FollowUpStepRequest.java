package com.backend.winai.dto.marketing;

import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FollowUpStepRequest {
    private Integer stepOrder;
    private Integer delayMinutes;
    private String messageType;
    private String customMessage;
    private Boolean active;
}
