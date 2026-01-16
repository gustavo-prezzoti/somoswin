package com.backend.winai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserWhatsAppConnectionResponse {

    private UUID id;
    private UUID companyId;
    private String companyName;
    private UUID createdByUserId;
    private String createdByUserName;
    private String instanceName;
    private String instanceToken;
    private String instanceBaseUrl;
    private String description;
    private Boolean isActive;
    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;
}
