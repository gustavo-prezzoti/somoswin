package com.backend.winai.dto.request;

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

    private Object answers;
    private Object activities;
    private LocalDate projectStartDate;
    private Integer currentStep;
}
