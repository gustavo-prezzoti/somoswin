package com.backend.winai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminNotificationRowResponse {

    private String id;
    private String title;
    private String message;
    private String type;
    private String createdAt;
    private boolean read;
    private String companyId;
    private String companyName;
    private String userName;
    private String userEmail;
    private String relatedEntityType;
    private String actionUrl;
}
