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
public class AdminUserResponse {

    private UUID id;
    private String name;
    private String email;
    private String role;
    private Boolean active;
    private String avatarUrl;
    private ZonedDateTime createdAt;
    private ZonedDateTime lastLogin;

    // Estatísticas
    private Long totalMessages;
    private Long totalConversations;
    private String companyName;
    private UUID companyId;
}
