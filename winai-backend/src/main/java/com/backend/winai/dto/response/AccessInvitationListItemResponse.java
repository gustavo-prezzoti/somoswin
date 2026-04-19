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
public class AccessInvitationListItemResponse {
    private UUID id;
    private String email;
    private String invitedName;
    private String jobTitle;
    private String role;
    private String status;
    private ZonedDateTime createdAt;
    private ZonedDateTime expiresAt;
}
