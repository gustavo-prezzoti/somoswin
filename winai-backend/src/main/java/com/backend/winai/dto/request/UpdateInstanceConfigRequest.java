package com.backend.winai.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateInstanceConfigRequest {

    private String webhookUrl;
    private String integration;
    private Boolean qrcodeEnabled;
    private String adminField01;
    private String adminField02;
}
