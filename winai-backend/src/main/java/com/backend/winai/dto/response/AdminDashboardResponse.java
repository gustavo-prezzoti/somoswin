package com.backend.winai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardResponse {

    private List<Kpi> kpis;
    private List<MeetingRow> upcomingMeetings;
    private List<AlertRow> priorityAlerts;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Kpi {
        private String label;
        private String value;
        private String subtitle;
        /** USERS, CLOCK, CALENDAR, DOLLAR — UI mapeia para ícone */
        private String icon;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MeetingRow {
        private String id;
        private String title;
        private String companyName;
        private String meetingDate;
        private String meetingTime;
        private String status;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AlertRow {
        private String id;
        private String title;
        private String message;
        private String type;
        private String createdAt;
        private boolean read;
        /** Prazo da tarefa de meta (yyyy-MM-dd); quando preenchido, alerta vem de Metas e Objetivos, não de notificação. */
        private String dueDate;
    }
}
