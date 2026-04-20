package com.backend.winai.dto.request;

import lombok.Data;

import java.util.UUID;

@Data
public class PatchInternalStaffRequest {

    private UUID ampliaStaffRoleId;

    private Boolean isActive;

    /** Se informada, redefine a senha (admin). */
    private String password;
}
