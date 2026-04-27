package com.backend.winai.dto.request;

import com.backend.winai.entity.UserPlan;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdatePlanRequest {

    private String displayName;
    private UserPlan planTier;
    private BigDecimal price;
    private BigDecimal setupFee;
    private Integer leadLimit;
    private Integer userLimit;
    private Integer whatsappLimit;
    private Boolean active;
    private String description;
    private String asaasPlanId;
}
