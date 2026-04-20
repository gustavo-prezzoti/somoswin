package com.backend.winai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AmpliaStaffRoleResponse {

    private UUID id;
    private String name;
    private String description;
    private boolean active;
    private boolean fullAccess;
    private Map<String, Boolean> permissions;
    /** VENDEDOR, CONSULTOR, GESTOR quando papel seed; senão null. */
    private String legacyStaffType;
}
