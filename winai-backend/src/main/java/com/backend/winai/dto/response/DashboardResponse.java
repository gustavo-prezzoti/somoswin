package com.backend.winai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {

    private UserSummary user;
    private MetricsSummary metrics;
    private List<ChartDataPoint> chartData;
    private List<GoalDTO> goals;
    private List<InsightDTO> insights;
    private List<CampaignSummaryDTO> campaigns;
    private List<LeadResponse> recentLeads;
    private Integer performanceScore;
    private String operationStatus;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CampaignSummaryDTO {
        private String name;
        private String status;
        private Integer leads;
        private String spend;
        private String cpl;
        private String conversion;
        private String roas;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserSummary {
        private String name;
        private String email;
        private String companyName;
        private String plan;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MetricsSummary {
        private MetricCard leadsCaptured;
        private MetricCard cplAverage;
        private MetricCard conversionRate;
        private MetricCard roi;
        private MetricCard roas;
        private MetricCard investment;
        private MetricCard impressions;
        private MetricCard clicks;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MetricCard {
        private String value;
        private String trend;
        private Boolean isPositive;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChartDataPoint {
        private String name; // Data formatada (ex: "23/12")
        private Integer atual;
        private Integer anterior;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GoalDTO {
        private Long id;
        private String title;
        private String description;
        private String type;
        private Integer targetValue;
        private Integer currentValue;
        private Integer progressPercentage;
        private String status;
        private Boolean isHighlighted;
        private LocalDate startDate;
        private LocalDate endDate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InsightDTO {
        private Long id;
        private String title;
        private String description;
        private String suggestionSource;
        private String insightType;
        private String priority;
        private String actionUrl;
        private String actionLabel;
        private Boolean isRead;
    }
}
