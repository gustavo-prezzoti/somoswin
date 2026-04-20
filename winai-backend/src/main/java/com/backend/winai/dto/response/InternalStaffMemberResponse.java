package com.backend.winai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InternalStaffMemberResponse {

    private UUID id;
    private String name;
    private String email;
    private String ampliaStaffType;
    private boolean active;
    private ZonedDateTime lastLogin;
    private long leadsTotal;
    private long leadsWon;
    private long meetingsThisWeek;
    /** Taxa de conversão aproximada leads ganhos / total atribuídos (0–100). */
    private int conversionPercent;
}
