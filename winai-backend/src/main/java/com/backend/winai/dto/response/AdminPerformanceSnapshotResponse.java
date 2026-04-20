package com.backend.winai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminPerformanceSnapshotResponse {

    /** Resumo comercial / operação */
    private long totalCompanies;
    private long newCompaniesThisMonth;
    private long totalLeads;
    private long leadsWon;
    private long meetingsThisWeek;
    private long incompleteDashboardTasks;

    /** Meta Ads (dados agregados das campanhas sincronizadas) */
    private long metaCampaignsCount;
    private long metaAccountsConnected;
    private Double totalSpend;
    private Long totalImpressions;
    private Long totalClicks;
    private Long totalReach;
    private Long totalConversions;
    /** CTR global aproximado: cliques / impressões */
    private Double ctrGlobal;

    /** Metas ativas no ciclo (soma por empresa) */
    private long activeGoalsTotal;

    private List<CompanyPerformanceRow> topCompaniesBySpend;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CompanyPerformanceRow {
        private String companyId;
        private String companyName;
        private Double spend;
        private Long impressions;
        private Long clicks;
        private Integer campaignCount;
    }
}
