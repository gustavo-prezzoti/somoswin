package com.backend.winai.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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

    @NotNull(message = "Delay é obrigatório")
    @Min(value = 0, message = "Delay não pode ser negativo")
    private Integer delayMinutes;

    @NotBlank(message = "Tipo de mensagem é obrigatório")
    private String messageType;

    private String customMessage;
    private String aiPrompt;

    @NotNull(message = "Status ativo é obrigatório")
    private Boolean active;
}
