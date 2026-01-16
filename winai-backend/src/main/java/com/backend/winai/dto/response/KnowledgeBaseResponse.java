package com.backend.winai.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.ZonedDateTime;
import java.util.UUID;

@Data
@Builder
public class KnowledgeBaseResponse {
    private UUID id;
    private String name;
    private String content;
    private String agentPrompt;
    private Boolean isActive;
    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;
}
