package com.backend.winai.dto.marketing.paidtraffic;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaidTrafficAssetRowDTO {
    public enum AssetLevel {
        CAMPAIGN, ADSET, AD
    }

    private String id;
    private AssetLevel level;
    private String name;
    private String status;
    private String objective;
    private Double dailyBudget;
    private Double spend;
    private Long impressions;
    private Long clicks;
    private Double ctr;
    private Long conversions;
    private Double cpl;
    /** ROAS quando houver valor de conversão; pode ser null */
    private Double roas;
    private Double roasVariationPct;
    private Double cplVariationPct;
    private Double ctrVariationPct;
    /** melhor | estavel | pior ou null */
    private String trend;
}
