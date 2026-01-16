package com.backend.winai.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminCreateUserRequest {

    private String name;
    private String email;
    private String password;
    private String role; // USER, ADMIN
    private String phone;
    private String companyId;
}
