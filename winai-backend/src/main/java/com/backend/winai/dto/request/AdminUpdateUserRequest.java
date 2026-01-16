package com.backend.winai.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUpdateUserRequest {

    private String name;
    private String email;
    private String password; // Se null, não altera
    private String role; // USER, ADMIN
    private String phone;
    private Boolean isActive;
    private String companyId;
}
