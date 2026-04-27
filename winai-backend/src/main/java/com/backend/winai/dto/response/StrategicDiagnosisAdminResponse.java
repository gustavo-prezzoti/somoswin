package com.backend.winai.dto.response;

import com.fasterxml.jackson.databind.JsonNode;
import io.swagger.v3.oas.annotations.media.Schema;
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
    @Schema(implementation = Object.class, description = "Respostas do diagnóstico (JSON arbitrário)")
    private JsonNode draftAnswers;
    @Schema(implementation = Object.class, description = "Atividades do playbook (array JSON)")
    private JsonNode draftActivities;
    private LocalDate draftProjectStartDate;
    private Integer draftCurrentStep;
    @Schema(implementation = Object.class)
    private JsonNode draftMetrics;
    private String draftCanalPrioritario;

    @Schema(implementation = Object.class)
    private JsonNode publishedAnswers;
    @Schema(implementation = Object.class)
    private JsonNode publishedActivities;
    private LocalDate publishedProjectStartDate;
    private String publishedCanalPrioritario;
    @Schema(implementation = Object.class)
    private JsonNode publishedMetrics;
    private ZonedDateTime publishedAt;
}
