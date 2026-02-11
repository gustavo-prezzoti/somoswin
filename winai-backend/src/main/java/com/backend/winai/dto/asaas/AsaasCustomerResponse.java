package com.backend.winai.dto.asaas;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AsaasCustomerResponse {
    private String id;
    private String name;
    private String cpfCnpj;
    private String email;
    private String phone;
    private String externalReference;
}
