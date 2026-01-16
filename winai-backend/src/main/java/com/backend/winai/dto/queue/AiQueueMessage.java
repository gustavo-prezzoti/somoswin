package com.backend.winai.dto.queue;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiQueueMessage implements Serializable {
    private String conversationId;
    private String userMessage;
    private String companyId;
    private String leadName; // Context field: User's name
    private Long timestamp;
}
