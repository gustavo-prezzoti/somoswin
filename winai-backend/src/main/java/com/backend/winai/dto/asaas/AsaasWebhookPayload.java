package com.backend.winai.dto.asaas;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AsaasWebhookPayload {
    private String event;
    private Payment payment;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Payment {
        private String id;
        private String customer;
        private String subscription;
        private String billingType;
        private Double value;
        private String status;
        private String dueDate;
        private String externalReference;
        private String confirmedDate;
        private String paymentDate;
    }
}
