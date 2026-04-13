package com.backend.winai.dto.marketing;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Totais agregados de insights da conta (Graph API) em um intervalo de datas. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountInsightTotals {
    private double spend;
    private long impressions;
    private long clicks;
    private long conversions;

    public static AccountInsightTotals empty() {
        return AccountInsightTotals.builder()
                .spend(0)
                .impressions(0)
                .clicks(0)
                .conversions(0)
                .build();
    }
}
