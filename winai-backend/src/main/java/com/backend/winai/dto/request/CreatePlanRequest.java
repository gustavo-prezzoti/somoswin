package com.backend.winai.dto.request;

import com.backend.winai.entity.UserPlan;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePlanRequest {

    /** Slug único: letras maiúsculas, dígitos e underscore. */
    @NotBlank
    private String name;

    @NotBlank
    private String displayName;

    @NotNull
    private UserPlan planTier;

    @NotNull
    private BigDecimal price;

    @NotNull
    private BigDecimal setupFee;

    private Integer leadLimit;
    private Integer userLimit;

    private Integer whatsappLimit;

    private String description;
    private String asaasPlanId;
}
