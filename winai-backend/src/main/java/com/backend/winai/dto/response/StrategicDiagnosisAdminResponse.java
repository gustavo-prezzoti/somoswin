package com.backend.winai.dto.response;

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
    @Schema(description = "Respostas do diagnóstico (objeto JSON)")
    private Object draftAnswers;
    @Schema(description = "Atividades do playbook (array JSON)")
    private Object draftActivities;
    private LocalDate draftProjectStartDate;
    private Integer draftCurrentStep;
    private Object draftMetrics;
    private String draftCanalPrioritario;

    private Object publishedAnswers;
    private Object publishedActivities;
    private LocalDate publishedProjectStartDate;
    private String publishedCanalPrioritario;
    private Object publishedMetrics;
    private ZonedDateTime publishedAt;
}
