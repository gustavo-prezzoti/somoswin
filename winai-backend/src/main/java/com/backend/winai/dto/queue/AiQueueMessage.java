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
    private String imageUrl; // URL of image (if any)
    private Long timestamp;
    /** wa_message_id — dedupe distribuído entre réplicas */
    private String waMessageId;
    /** text|audio|image|video|document|sticker — usado pelo decisor e regeneração */
    private String mediaType;
    /** Timestamp do WhatsApp (ms) — separado de timestamp local p/ filtro de staleness */
    private Long whatsAppTimestamp;
}
