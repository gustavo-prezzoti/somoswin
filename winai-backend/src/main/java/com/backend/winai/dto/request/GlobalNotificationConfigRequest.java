package com.backend.winai.dto.request;

import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GlobalNotificationConfigRequest {
    private UUID companyId;
    private Boolean humanHandoffNotificationEnabled;
    private String humanHandoffPhone;
    private String humanHandoffMessage;
    private String humanHandoffClientMessage;
}
