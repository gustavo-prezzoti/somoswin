package com.backend.winai.dto.request;

import com.backend.winai.entity.GoalType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateGoalRequest {
    
    @NotBlank(message = "Título é obrigatório")
    private String title;
    
    private String description;
    
    @NotNull(message = "Tipo da meta é obrigatório")
    private GoalType goalType;
    
    @NotNull(message = "Valor alvo é obrigatório")
    @Positive(message = "Valor alvo deve ser positivo")
    private Integer targetValue;
    
    private Integer yearCycle;
}

