package com.backend.winai.dto.marketing.paidtraffic;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaidTrafficTargetDTO {
    private String yearMonth;
    private BigDecimal investmentGoal;
    private BigDecimal roasGoal;
    private BigDecimal cplGoal;
    private BigDecimal ctrGoal;
}
