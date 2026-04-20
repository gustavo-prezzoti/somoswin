package com.backend.winai.dto.request;

import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Map;

@Data
public class PatchAmpliaStaffRoleRequest {

    @Size(max = 120)
    private String name;

    private String description;

    private Boolean active;

    private Boolean fullAccess;

    private Map<String, Boolean> permissions;
}
