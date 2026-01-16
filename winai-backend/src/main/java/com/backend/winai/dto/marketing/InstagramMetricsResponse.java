package com.backend.winai.dto.marketing;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InstagramMetricsResponse {
    private MetricDetail followers;
    private MetricDetail engagementRate;
    private MetricDetail impressions;
    private MetricDetail interactions;
    private List<DailyPerformance> performanceHistory;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MetricDetail {
        private String value;
        private String trend;
        private boolean isPositive;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyPerformance {
        private String date;
        private Double value;
    }
}
