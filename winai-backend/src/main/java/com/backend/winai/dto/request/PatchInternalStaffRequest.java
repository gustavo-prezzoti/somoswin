package com.backend.winai.dto.request;

import lombok.Data;

@Data
public class PatchInternalStaffRequest {

    /** VENDEDOR, CONSULTOR ou GESTOR */
    private String ampliaStaffType;

    private Boolean isActive;

    /** Se informada, redefine a senha (admin). */
    private String password;
}
