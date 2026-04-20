package com.backend.winai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InternalStaffMemberResponse {

    private UUID id;
    private String name;
    private String email;
    /** Legado: VENDEDOR, CONSULTOR, GESTOR quando o papel define legacyStaffType. */
    private String ampliaStaffType;
    private UUID ampliaStaffRoleId;
    private String ampliaStaffRoleName;
    private List<String> ampliaStaffPermissions;
    private Boolean ampliaStaffFullAccess;
    private boolean active;
    private ZonedDateTime lastLogin;
    private long leadsTotal;
    private long leadsWon;
    private long meetingsThisWeek;
    /** Taxa de conversão aproximada leads ganhos / total atribuídos (0–100). */
    private int conversionPercent;
}
