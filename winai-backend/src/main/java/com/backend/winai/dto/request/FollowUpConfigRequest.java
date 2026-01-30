package com.backend.winai.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FollowUpConfigRequest {

    @NotNull(message = "ID da empresa é obrigatório")
    private UUID companyId;

    @NotNull(message = "Status ativado/desativado é obrigatório")
    private Boolean enabled;

    /**
     * Tempo de inatividade em minutos antes de disparar follow-up.
     */
    @NotNull(message = "Tempo de inatividade é obrigatório")
    @Min(value = 1, message = "Tempo de inatividade deve ser de pelo menos 1 minuto")
    private Integer inactivityMinutes;

    @NotNull(message = "Trigger de mensagem do lead é obrigatória")
    private Boolean triggerOnLeadMessage;

    @NotNull(message = "Trigger de resposta da IA é obrigatória")
    private Boolean triggerOnAiResponse;

    @NotNull(message = "Hora de início é obrigatória")
    @Min(0)
    @Max(23)
    private Integer startHour;

    @NotNull(message = "Hora de fim é obrigatória")
    @Min(0)
    @Max(23)
    private Integer endHour;

    /**
     * Se true, follow-ups são enviados periodicamente.
     */
    private java.util.List<FollowUpStepRequest> steps;
}
