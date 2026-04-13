package com.backend.winai.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateGoalCheckpointRequest {

    @NotNull
    private LocalDate dataPrevista;

    private LocalDate dataRealizada;

    private Integer semana;

    @NotNull
    private String status;

    private String analiseIaJson;

    private String ajustesSugeridosJson;

    private Integer sortOrder;
}
