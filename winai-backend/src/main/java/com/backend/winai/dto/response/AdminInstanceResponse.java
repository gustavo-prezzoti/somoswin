package com.backend.winai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminInstanceResponse {

    private String instanceId;
    private String instanceName;
    private String status;
    private String token;
    private String webhookUrl;
    private String integration;
    private Boolean qrcodeEnabled;
    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;

    // Informações de conexão
    private Boolean connected;
    private String phoneNumber;
    private String profileName;
    private String profilePicUrl;

    // Estatísticas
    private Long totalMessages;
    private Long totalConversations;
    private ZonedDateTime lastActivity;
}
