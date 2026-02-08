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
public class UserTermsAcceptanceResponse {
    private UUID userId;
    private String userName;
    private String userEmail;
    private String companyName;
    private Boolean hasAccepted;
    private String termsVersion;
    private ZonedDateTime acceptedAt;
}
