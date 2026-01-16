package com.backend.winai.dto.request;

import lombok.Data;

@Data
public class CreateKnowledgeBaseRequest {
    private String name;
    private String content;
    private String agentPrompt;
    private String systemTemplate;
}
