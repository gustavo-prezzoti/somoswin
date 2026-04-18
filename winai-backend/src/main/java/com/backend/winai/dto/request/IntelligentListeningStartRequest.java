package com.backend.winai.dto.request;

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
public class IntelligentListeningStartRequest {

    @NotNull(message = "leadId é obrigatório")
    private UUID leadId;

    /** Opcional — padrão: "Escuta Inteligente — {nome do lead}" */
    private String title;
}
