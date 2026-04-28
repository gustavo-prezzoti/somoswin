package com.backend.winai.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

/**
 * Performance detalhada de um colaborador interno Amplia — vendas (CRM) ou consultoria (playbook / metas).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAmpliaStaffPerformanceResponse {

    @Schema(description = "UUID do colaborador")
    private UUID staffUserId;

    private String name;
    private String email;

    /**
     * Papel seed: VENDEDOR, CONSULTOR, GESTOR ou null.
     */
    private String ampliaStaffType;

    private String ampliaStaffRoleName;

    /**
     * sales = painel comercial (CRM); consultant = playbook e tarefas de metas (sem modo combinado).
     */
    private String uiMode;

    private String periodLabel;

    private SalesBlock sales;

    private ConsultantBlock consultant;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SalesBlock {
        private long leadsTotal;
        private long leadsWon;
        private int conversionPercent;
        private long meetingsThisWeek;
        /** Soma estimatedValue dos leads WON */
        private Double revenueWonTotal;
        private List<ClosedDealRow> recentDeals;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClosedDealRow {
        private String leadName;
        private String companyName;
        private Double valueBrl;
        private String statusLabel;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConsultantBlock {
        /** Playbooks com publishedAt preenchido e última atualização por este usuário */
        private int playbooksPublished;
        private int companiesWithPlaybook;
        /** Tarefas de meta concluídas em empresas com playbook publicado por este usuário */
        private long goalTasksCompleted;
        private Long goalTasksTotal;
        /** 0–100 quando goalTasksTotal > 0 */
        private Integer playbookGoalProgressPercent;
        private List<PlaybookDeliveryRow> recentDeliveries;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PlaybookDeliveryRow {
        private String companyName;
        /** ISO-8601 */
        private String publishedAt;
    }
}
