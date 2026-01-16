package com.backend.winai.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateUserWhatsAppConnectionRequest {

    @NotNull(message = "Company ID é obrigatório")
    private UUID companyId;

    private UUID createdByUserId;

    @NotBlank(message = "Nome da instância é obrigatório")
    private String instanceName;

    private String instanceToken;

    private String instanceBaseUrl;

    private String description;

    @Builder.Default
    private Boolean isActive = true;
}
