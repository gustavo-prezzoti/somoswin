package com.backend.winai.dto.response;

import com.backend.winai.entity.UserPlan;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private Long expiresIn;
    private UserDTO user;
    private String nextAction;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserDTO {
        private UUID id;
        private String email;
        private String name;
        private String role;
        private String plan;
        private CompanyDTO company;
        private String avatarUrl;
        private String phone;
        private String jobTitle;
        /** Colaborador interno Amplia (sem assinatura no app cliente). */
        private Boolean ampliaInternalStaff;
        /** VENDEDOR, CONSULTOR, GESTOR — quando ampliaInternalStaff. */
        private String ampliaStaffType;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CompanyDTO {
        private UUID id;
        private String name;
        private String segment;
        private UserPlan plan;
    }
}
