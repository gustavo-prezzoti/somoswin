package com.backend.winai.dto.uazap;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonAlias;
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
    @JsonAlias("instance")
    private String instanceName;

    @JsonAlias("state")
    private String status;
    private String token;

    // Configurações
    private String webhook;
    private String integration;
    private Object qrcode;

    // Informações de conexão
    @JsonProperty("number")
    private String phoneNumber;

    /** JID ou número bruto (ex.: 5511999999999@s.whatsapp.net) — comum quando "number" não vem na listagem. */
    @JsonProperty("owner")
    private String owner;

    @JsonProperty("wid")
    private String wid;

    @JsonProperty("profileName")
    private String profileName;

    @JsonProperty("profilePictureUrl")
    private String profilePicUrl;
}
