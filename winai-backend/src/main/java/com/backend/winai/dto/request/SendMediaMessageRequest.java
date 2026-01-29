package com.backend.winai.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SendMediaMessageRequest {

    private String phoneNumber;
    private UUID leadId;
    private String caption; // Legenda para imagens/vídeos
    private String mediaUrl; // URL da mídia (pode ser do Supabase ou externa)
    private String mediaType; // image, video, audio, document
    private String fileName; // Nome do arquivo
    private String mimeType; // tipo MIME (image/jpeg, video/mp4, audio/ogg, etc)

    // Para áudio
    private Boolean ptt; // Push to talk (áudio como mensagem de voz)

    // Para documentos
    private String documentName;

    // Instância do WhatsApp a ser usada
    private String uazapInstance;

    private String uazapBaseUrl;
    private String uazapToken;
}
