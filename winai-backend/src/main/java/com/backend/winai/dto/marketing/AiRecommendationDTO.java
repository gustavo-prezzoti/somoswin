package com.backend.winai.dto.marketing;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiRecommendationDTO {
    private String id;
    private String type;
    private String title;
    private String description;
    private String actionLabel;
    private String actionType;
    private String campaignId;
    private String campaignName;
    private Object payload;
}
