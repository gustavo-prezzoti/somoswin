package com.backend.winai.dto.marketing.paidtraffic;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaidTrafficOverviewResponse {
    public enum Platform {
        META, GOOGLE
    }

    private Platform platform;
    private boolean connected;
    private String connectionMessage;

    private List<PaidTrafficKpiCardDTO> kpis;
    private BudgetPaceDTO budgetPace;
    private PaidTrafficInsightBannerDTO insightBanner;

    /** Nível atual da tabela: campanhas, conjuntos ou anúncios */
    private String tableLevel;
    private List<PaidTrafficAssetRowDTO> rows;

    private String startDate;
    private String endDate;
}
