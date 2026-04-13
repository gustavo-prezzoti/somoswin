package com.backend.winai.dto.marketing.paidtraffic;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaidTrafficKpiCardDTO {
    private String key;
    private String label;
    private String value;
    private String trend;
    private boolean trendPositive;
    /** Meta de negócio (ex.: Meta: R$ 15.000,00) */
    private String goalLabel;
    /** Benchmark / planejado */
    private String benchmarkLabel;
}
