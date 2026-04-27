package com.backend.winai.dto.request;

import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class UpdateKnowledgeBaseRequest {
    private String name;
    private String content;
    private String agentPrompt;
    private Boolean isActive;
    private String systemTemplate;
    /** Se não null, substitui a lista de documentos vinculados ao agente. */
    private List<UUID> agentDocumentIds;
}
