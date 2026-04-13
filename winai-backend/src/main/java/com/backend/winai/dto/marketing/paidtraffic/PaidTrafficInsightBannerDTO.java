package com.backend.winai.dto.marketing.paidtraffic;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaidTrafficInsightBannerDTO {
    private String title;
    private String description;
    private String statusLabel;
    private String statusValue;
    private String actionTakenLabel;
    private String actionTakenValue;
    private boolean visible;
}
