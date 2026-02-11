package com.backend.winai.dto.asaas;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AsaasSubscriptionResponse {
    private String id;
    private String customer;
    private String billingType;
    private Double value;
    private String nextDueDate;
    private String cycle;
    private String status;
    private String description;
    private String externalReference;
}
