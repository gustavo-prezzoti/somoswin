package com.backend.winai.dto.consultancy;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsultancyClientAppearancePatchRequest {
    private String displayName;
    private String role;
    private String avatarUrl;
    private String kicker;
    private String headlinePrefix;
    private String headlineAccent;
    private String nextSectionCaption;
    private String requestCardTitle;
    private String requestCardDescription;
}
