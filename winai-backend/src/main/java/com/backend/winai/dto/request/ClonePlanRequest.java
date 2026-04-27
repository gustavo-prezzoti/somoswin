package com.backend.winai.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClonePlanRequest {

    @NotBlank
    private String displayName;

    /** Opcional; se vazio, gerado no servidor (slug único). */
    private String name;

    private BigDecimal price;
    private BigDecimal setupFee;
    private Integer leadLimit;
    private Integer userLimit;
    private Integer whatsappLimit;
    private String description;
}
