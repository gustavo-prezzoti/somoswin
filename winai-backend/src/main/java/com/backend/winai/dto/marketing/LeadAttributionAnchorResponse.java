package com.backend.winai.dto.marketing;

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
public class LeadAttributionAnchorResponse {
    private UUID id;
    private String anchorText;
    private String utmSource;
    private String utmMedium;
    private String utmCampaign;
    private String utmContent;
    private String utmTerm;
    private String gclid;
    private String fbclid;
    private boolean active;
    private String label;
    private String notes;
    private ZonedDateTime createdAt;
}
