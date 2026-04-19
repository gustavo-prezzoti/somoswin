package com.backend.winai.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminEscutaStartRequest {

    @NotNull
    private UUID companyId;

    @NotNull
    private UUID leadId;

    /** Opcional — padrão no serviço: "Escuta Inteligente — {lead}" */
    private String title;
}
