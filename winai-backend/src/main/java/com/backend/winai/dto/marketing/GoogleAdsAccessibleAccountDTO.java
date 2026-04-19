package com.backend.winai.dto.marketing;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Conta Google Ads acessível ao usuário após OAuth (listAccessibleCustomers + metadados). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GoogleAdsAccessibleAccountDTO {
    /** ID numérico sem hífens (10 dígitos). */
    private String customerId;
    private String descriptiveName;
    /** true = conta gestora (MCC); campanhas costumam estar em contas filhas. */
    private boolean manager;
}
