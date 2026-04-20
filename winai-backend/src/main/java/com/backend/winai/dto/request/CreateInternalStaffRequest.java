package com.backend.winai.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateInternalStaffRequest {

    @NotBlank
    private String name;

    @NotBlank
    @Email
    private String email;

    /** VENDEDOR, CONSULTOR ou GESTOR */
    @NotNull
    private String ampliaStaffType;

    /** Se vazio, o sistema gera senha temporária (retornada na resposta). */
    private String password;
}
