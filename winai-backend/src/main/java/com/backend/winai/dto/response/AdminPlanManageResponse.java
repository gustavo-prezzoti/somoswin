package com.backend.winai.dto.response;

import com.backend.winai.entity.UserPlan;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminPlanManageResponse {

    private UUID id;
    private String name;
    private UserPlan planTier;
    private String displayName;
    private BigDecimal price;
    private BigDecimal setupFee;
    private Integer leadLimit;
    private Integer userLimit;
    private Integer whatsappLimit;
    private boolean active;
    private String description;
    private String asaasPlanId;
    private long companiesCount;
    private long pendingCompaniesCount;
}
