package com.backend.winai.dto.request;

import com.backend.winai.entity.GoalType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

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

    /** Valor atual (ex.: faturamento já realizado). Opcional na criação/atualização. */
    private Integer currentValue;

    private Integer yearCycle;

    private LocalDate startDate;

    private LocalDate endDate;

    /** Classe CSS (ex.: bg-emerald-500). */
    private String color;

    private Integer prazoDias;

    /** Cenário estratégico (mock: estrategia_ok, ajustar_estrategia, …). */
    private String scenario;

    private String unit;

    /** Progresso de resultado (KPI), opcional. */
    private Integer progressoResultado;

    /** Tarefas operacionais iniciais (opcional; se vazio, o backend pode gerar padrão). */
    private List<CreateGoalTaskRequest> tasks;

    private List<CreateGoalCheckpointRequest> checkpoints;
}
