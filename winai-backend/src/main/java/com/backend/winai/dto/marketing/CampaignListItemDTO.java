package com.backend.winai.dto.marketing;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampaignListItemDTO {
    private String id;
    private String name;
    private String status;
    private String objective;
    private String accountName;
    private String accountId;
    private Double dailyBudget;
    private Double spend;
    private Long impressions;
    private Long reach;
    private Double ctr;
    private Long conversions;
    private Double cpl;
}
