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
public class AdminMetaAdsCompanyResponse {

    private UUID companyId;
    private String companyName;
    private boolean connected;
    private String adAccountId;
    private String accountName;
    private String pageId;
    private String instagramBusinessId;
    private long campaignCount;

    /** Soma dos campos sincronizados em meta_campaigns (último snapshot por campanha). */
    private Double syncedSpendTotal;
    private Long syncedImpressionsTotal;
    private Long syncedClicksTotal;
    private Long syncedConversionsTotal;

    /** Soma de estimated_value dos leads da empresa (CRM). */
    private Double estimatedRevenueTotal;
}
