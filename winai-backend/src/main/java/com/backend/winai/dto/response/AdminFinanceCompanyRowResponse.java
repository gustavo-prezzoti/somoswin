package com.backend.winai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminFinanceCompanyRowResponse {
    private UUID companyId;
    private String companyName;
    private String planName;
    private BigDecimal monthlyValue;
    /** Próximo vencimento (cobrança) conforme cadastro. */
    private String dueDate;
    /**
     * EM_DIA | PENDENTE | ATRASADO | CANCELADO | SEM_PLANO
     */
    private String billingStatus;
    private String subscriptionStatusRaw;
    private boolean hasAsaasCustomer;
    private boolean hasAsaasSubscription;
}
