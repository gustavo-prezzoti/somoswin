package com.backend.winai.dto.response;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.ZonedDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StrategicPlaybookResponse {

    private boolean published;
    private String canalPrioritario;
    private LocalDate projectStartDate;
    private JsonNode activities;
    private JsonNode answers;
    private ZonedDateTime publishedAt;
}
