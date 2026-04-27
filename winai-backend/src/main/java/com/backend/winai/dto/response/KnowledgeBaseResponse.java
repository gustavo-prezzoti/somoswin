package com.backend.winai.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class KnowledgeBaseResponse {
    private UUID id;
    private String name;
    private String content;
    private String agentPrompt;
    private Boolean isActive;
    private String systemTemplate;
    private List<UUID> agentDocumentIds;
    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;
}
