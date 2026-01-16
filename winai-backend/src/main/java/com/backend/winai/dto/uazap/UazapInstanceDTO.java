package com.backend.winai.dto.uazap;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class UazapInstanceDTO {
    @JsonProperty("id")
    private String instanceId;

    @JsonProperty("name")
    private String instanceName;

    private String status;
    private String token;

    // Configurações
    private String webhook;
    private String integration;
    private Object qrcode;

    // Informações de conexão
    @JsonProperty("number")
    private String phoneNumber;

    @JsonProperty("profileName")
    private String profileName;

    @JsonProperty("profilePictureUrl")
    private String profilePicUrl;
}
