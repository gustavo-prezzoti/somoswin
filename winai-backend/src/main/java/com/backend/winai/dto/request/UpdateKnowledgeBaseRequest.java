package com.backend.winai.dto.request;

import lombok.Data;

@Data
public class UpdateKnowledgeBaseRequest {
    private String name;
    private String content;
    private String agentPrompt;
    private Boolean isActive;
}
