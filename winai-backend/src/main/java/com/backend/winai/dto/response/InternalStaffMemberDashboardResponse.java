package com.backend.winai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InternalStaffMemberDashboardResponse {

    private UUID userId;
    private String name;
    private String email;
    private String ampliaStaffType;
    private UUID ampliaStaffRoleId;
    private String ampliaStaffRoleName;

    private long leadsTotal;
    private long leadsWon;
    private long meetingsThisWeek;
    private String conversionRateDisplay;

    /** Série para gráficos (últimos meses). */
    private List<MonthlyPoint> monthlyLeads;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlyPoint {
        private String name;
        private long value;
    }
}
