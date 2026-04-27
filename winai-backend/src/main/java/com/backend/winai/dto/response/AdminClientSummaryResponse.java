package com.backend.winai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminClientSummaryResponse {

    private UUID companyId;
    private String name;
    /** Nicho / segmento cadastral */
    private String niche;
    private String planName;
    private String subscriptionStartDate;
    private String subscriptionEndDate;
    /** ISO-8601 instant ou data do último login de algum usuário da empresa */
    private String lastAccess;
    /** "Em dia" | "Atrasado" | "Muito atrasado" (paridade com painel-admin) */
    private String checkpointStatus;
    /** "Normal" | "Atenção" | "Risco" | "Top" */
    private String clientStatus;
    private UUID sellerId;
    private String sellerName;
    private String consultantName;
}
