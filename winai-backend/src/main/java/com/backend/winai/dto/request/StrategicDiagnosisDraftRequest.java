package com.backend.winai.dto.request;

import com.fasterxml.jackson.databind.JsonNode;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StrategicDiagnosisDraftRequest {

    @Schema(implementation = Object.class)
    private JsonNode answers;
    @Schema(implementation = Object.class)
    private JsonNode activities;
    private LocalDate projectStartDate;
    private Integer currentStep;
}
