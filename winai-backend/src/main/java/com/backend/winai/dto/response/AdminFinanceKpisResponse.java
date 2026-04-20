package com.backend.winai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminFinanceKpisResponse {
    /** Soma do valor mensal (plano) das empresas com assinatura ativa. */
    private BigDecimal mrr;
    private int mrrCompanyCount;
    /** Soma dos valores de plano em atraso / inadimplência estimada. */
    private BigDecimal overdueTotal;
    private long overdueCompanyCount;
    /** Ticket médio (plano) entre empresas com assinatura ativa. */
    private BigDecimal averageTicket;
    /** MRR × 12 (projeção anual linear). */
    private BigDecimal arrr;
    private long cancelledCompanyCount;
    /** Churn aproximado: canceladas / (ativas + canceladas com plano). */
    private BigDecimal churnRatePercent;
    private long companiesConsidered;
}
