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
public class GlobalNotificationConfigResponse {
    private UUID id;
    private UUID companyId;
    private Boolean humanHandoffNotificationEnabled;
    private String humanHandoffPhone;
    private String humanHandoffMessage;
    private String humanHandoffClientMessage;
    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;
}
