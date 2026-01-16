package com.backend.winai.dto.marketing;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCampaignRequest {
    private String name;
    private String objective; // Vendas, Leads, etc.
    private Double dailyBudget;
    private String location;
    private String ageRange;
    private String interests;

    // Creative Source
    private String creativeType; // "DRIVE" or "LINK"
    private String creativeSource; // Filename or URL
}
