package com.backend.winai.dto.request;

import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class CreateKnowledgeBaseRequest {
    private String name;
    private String content;
    private String agentPrompt;
    private String systemTemplate;
    /** Opcional: documentos da empresa já cadastrados no admin. */
    private List<UUID> agentDocumentIds;
}
