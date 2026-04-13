package com.backend.winai.dto.request;

import com.backend.winai.entity.GoalTaskLevel;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
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
public class CreateGoalTaskRequest {

    @NotBlank
    private String title;

    private String description;

    @NotNull
    @Min(1)
    @Max(4)
    private Integer week;

    @NotNull
    private GoalTaskLevel level;

    @Builder.Default
    private Integer weight = 1;

    private LocalDate deadline;

    @Builder.Default
    private Boolean evidenciaObrigatoria = false;

    private String evidenciaJson;

    private Integer sortOrder;
}
