package com.backend.winai.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserWhatsAppConnectionRequest {

    private String instanceToken;

    private String instanceBaseUrl;

    private String description;

    private Boolean isActive;
}
