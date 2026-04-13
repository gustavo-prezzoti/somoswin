package com.backend.winai.dto.request;

import com.backend.winai.entity.GoalTaskLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateGoalTaskRequest {

    private String title;
    private String description;
    private Integer week;
    private GoalTaskLevel level;
    private Integer weight;
    private Boolean completed;
    private LocalDate deadline;
    private Boolean evidenciaObrigatoria;
    private String evidenciaJson;
    private Integer sortOrder;
}
