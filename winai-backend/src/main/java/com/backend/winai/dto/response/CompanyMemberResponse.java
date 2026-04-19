package com.backend.winai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyMemberResponse {
    private UUID id;
    private String email;
    private String name;
    private String role;
    private String jobTitle;
    private Boolean isActive;
    private String avatarUrl;
}
