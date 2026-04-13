package com.backend.winai.dto.marketing.paidtraffic;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BudgetPaceDTO {
    private double spent;
    private double planned;
    private double percentageSpent;
    private double timeElapsed;
    private double idealDailyRate;
    private double projectedEndAmount;
    private String recommendation;
}
