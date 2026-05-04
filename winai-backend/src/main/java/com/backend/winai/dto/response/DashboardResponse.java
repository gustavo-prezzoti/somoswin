package com.backend.winai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {

    private UserSummary user;
    private MetricsSummary metrics;
    private List<ChartDataPoint> chartData;
    private List<GoalDTO> goals;
    private List<InsightDTO> insights;
    private List<CampaignSummaryDTO> campaigns;
    private List<LeadResponse> recentLeads;
    /** Todas as metas ativas do ciclo (gráficos / visão mensal). */
    private List<GoalDTO> goalsOverview;
    private RevenueGoalDTO revenueGoal;
    private List<DashboardTaskDTO> weeklyTasks;
    private Integer performanceScore;
    private String operationStatus;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CampaignSummaryDTO {
        private String name;
        private String status;
        private String objective;
        private Integer leads;
        private String spend;
        private String cpl;
        private String conversion;
        private String roas;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserSummary {
        private String name;
        private String email;
        private String companyName;
        private String plan;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MetricsSummary {
        private MetricCard leadsCaptured;
        private MetricCard cplAverage;
        private MetricCard conversionRate;
        private MetricCard roi;
        private MetricCard roas;
        private MetricCard investment;
        private MetricCard impressions;
        private MetricCard clicks;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MetricCard {
        private String value;
        private String trend;
        private Boolean isPositive;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChartDataPoint {
        private String name; // Data formatada (ex: "23/12")
        private Integer atual;
        private Integer anterior;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GoalDTO {
        private Long id;
        private String title;
        private String description;
        private String type;
        private Integer targetValue;
        private Integer currentValue;
        private Integer progressPercentage;
        private String status;
        private Boolean isHighlighted;
        private LocalDate startDate;
        private LocalDate endDate;
        /** Ciclo anual da meta (filtro por ano). */
        private Integer yearCycle;

        /** Criação (filtro de trimestre quando início/fim ausentes). */
        private LocalDateTime createdAt;

        /** UI: dot / bar (Tailwind). */
        private String color;
        private Integer prazoDias;
        private String scenario;
        private String unit;
        /** Progresso resultado (KPI), quando informado. */
        private Integer progressoResultado;
        /** Progresso calculado pelas tarefas (peso). 0–100. */
        private Integer executionProgressPercentage;
        /** Planejado esperado para o mês do trimestre (1–3), 0–100. */
        private Integer expectedProgressPercentage;

        private List<GoalTaskDTO> tasks;
        private List<GoalCheckpointDTO> checkpoints;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GoalTaskDTO {
        private Long id;
        private String title;
        private String description;
        private Integer week;
        private String level;
        private Integer weight;
        private Boolean completed;
        private String completedAt;
        private LocalDate deadline;
        private String status;
        private Boolean evidenciaObrigatoria;
        private String evidenciaJson;
        private Integer sortOrder;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GoalCheckpointDTO {
        private Long id;
        private LocalDate dataPrevista;
        private LocalDate dataRealizada;
        private Integer semana;
        private String status;
        private String analiseIaJson;
        private String ajustesSugeridosJson;
        private Integer sortOrder;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RevenueGoalDTO {
        /** ID da meta REVENUE ativa, se existir. */
        private Long goalId;
        private Integer targetValue;
        private Integer currentValue;
        private Integer progressPercentage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardTaskDTO {
        private Long id;
        private String title;
        private String category;
        private String priority;
        private Boolean completed;
        private Integer sortOrder;
        /**
         * {@code dashboard} = checklist legada ({@code dashboard_tasks}); {@code playbook} = atividade do diagnóstico / playbook 90 dias.
         */
        private String taskSource;
        /** Quando {@code taskSource == playbook}, o id estável da atividade no JSON publicado. */
        private String playbookActivityId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InsightDTO {
        private Long id;
        private String title;
        private String description;
        private String suggestionSource;
        private String insightType;
        private String priority;
        private String actionUrl;
        private String actionLabel;
        private Boolean isRead;
    }
}
