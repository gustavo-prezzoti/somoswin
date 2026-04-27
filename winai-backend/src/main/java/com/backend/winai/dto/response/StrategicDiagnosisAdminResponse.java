package com.backend.winai.dto.response;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StrategicDiagnosisAdminResponse {

    private UUID companyId;
    private JsonNode draftAnswers;
    private JsonNode draftActivities;
    private LocalDate draftProjectStartDate;
    private Integer draftCurrentStep;
    private JsonNode draftMetrics;
    private String draftCanalPrioritario;

    private JsonNode publishedAnswers;
    private JsonNode publishedActivities;
    private LocalDate publishedProjectStartDate;
    private String publishedCanalPrioritario;
    private JsonNode publishedMetrics;
    private ZonedDateTime publishedAt;
}
