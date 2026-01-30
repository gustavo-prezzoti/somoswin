package com.backend.winai.dto.marketing;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class GlobalNotificationConfigRequest {
    private UUID companyId;
    private Boolean humanHandoffNotificationEnabled;
    private String humanHandoffPhone;
    private String humanHandoffMessage;
    private String humanHandoffClientMessage;
}
