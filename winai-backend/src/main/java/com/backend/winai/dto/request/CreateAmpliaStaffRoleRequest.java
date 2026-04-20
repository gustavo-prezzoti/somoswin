package com.backend.winai.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.HashMap;
import java.util.Map;

@Data
public class CreateAmpliaStaffRoleRequest {

    @NotBlank
    @Size(max = 120)
    private String name;

    private String description;

    @NotNull
    private Boolean fullAccess;

    /** Chaves = ids AmpliaAdminModule; valores = permitido. */
    @NotNull
    private Map<String, Boolean> permissions = new HashMap<>();
}
