package com.backend.winai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeadResponse {

    private UUID id;
    private String name;
    private String email;
    private String phone;
    private String status;
    private String statusLabel;
    private String ownerName;
    private String notes;
    private String source;
    private String trackId;
    private String trackSource;
    private String utmSource;
    private String utmMedium;
    private String utmCampaign;
    private String utmContent;
    private String utmTerm;
    private BigDecimal estimatedValue;
    private Integer leadScore;
    private String profilePictureUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
