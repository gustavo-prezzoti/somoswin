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
public class TermsOfServiceResponse {
    private UUID id;
    private String version;
    private String content;
    private Boolean active;
    private ZonedDateTime createdAt;
}
