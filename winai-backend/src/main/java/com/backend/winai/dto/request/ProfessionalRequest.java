package com.backend.winai.dto.request;

import com.backend.winai.entity.Professional.ProfessionalType;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfessionalRequest {

    @NotBlank(message = "Nome é obrigatório")
    private String name;

    @NotBlank(message = "Especialidade é obrigatória")
    private String specialty;

    @NotNull(message = "Rating é obrigatório")
    @DecimalMin(value = "0.0", message = "Rating mínimo é 0")
    @DecimalMax(value = "5.0", message = "Rating máximo é 5")
    private BigDecimal rating;

    @NotNull(message = "Preço é obrigatório")
    @DecimalMin(value = "0.0", message = "Preço não pode ser negativo")
    private BigDecimal price;

    private String imageUrl;

    @NotBlank(message = "WhatsApp é obrigatório")
    @Pattern(regexp = "^\\+\\d{1,3}\\d{2}\\d{8,9}$", message = "Formato de WhatsApp inválido. Use: +5511999999999")
    private String whatsapp;

    @NotNull(message = "Tipo é obrigatório")
    private ProfessionalType type;

    @Builder.Default
    private Boolean active = true;
}
