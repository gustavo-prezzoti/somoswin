package com.backend.winai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyProfileResponse {
    private UUID id;
    private String name;
    private String segment;
    private String website;
    private String instagramHandle;
    private String revenueRange;
    private String teamSize;
    private String cityState;
    private String whatsapp;
    private String leadVolume;
}
