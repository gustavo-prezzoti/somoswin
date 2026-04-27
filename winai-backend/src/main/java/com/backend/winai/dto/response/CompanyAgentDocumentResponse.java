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
public class CompanyAgentDocumentResponse {
    private UUID id;
    private UUID companyId;
    private String title;
    private String publicUrl;
    private String mimeType;
    private String originalFilename;
    private Long fileSize;
    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;
}
