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
public class AdminLeadResponse {

    private UUID id;
    private UUID companyId;
    private String companyName;
    private String name;
    private String email;
    private String phone;
    private String status;
    private String statusLabel;
    private String ownerName;
    private String notes;
    private String source;
    private BigDecimal estimatedValue;
    private Integer leadScore;
    private String profilePictureUrl;
    private String aiSummary;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
