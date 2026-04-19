package com.backend.winai.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCompanyProfileRequest {
    private String segment;
    private String website;
    private String instagramHandle;
    private String revenueRange;
    private String teamSize;
    private String cityState;
}
