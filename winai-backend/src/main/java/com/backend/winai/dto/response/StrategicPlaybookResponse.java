package com.backend.winai.dto.response;

import com.fasterxml.jackson.databind.JsonNode;
import io.swagger.v3.oas.annotations.media.Schema;
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
    @Schema(implementation = Object.class)
    private JsonNode activities;
    @Schema(implementation = Object.class)
    private JsonNode answers;
    private ZonedDateTime publishedAt;
}
