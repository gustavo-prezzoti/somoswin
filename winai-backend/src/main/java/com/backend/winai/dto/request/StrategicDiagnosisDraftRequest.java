package com.backend.winai.dto.request;

import com.fasterxml.jackson.databind.JsonNode;
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

    private JsonNode answers;
    private JsonNode activities;
    private LocalDate projectStartDate;
    private Integer currentStep;
}
