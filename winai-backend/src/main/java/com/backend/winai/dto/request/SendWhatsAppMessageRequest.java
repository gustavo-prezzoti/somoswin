package com.backend.winai.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SendWhatsAppMessageRequest {
    
    @NotBlank(message = "Número do telefone é obrigatório")
    private String phoneNumber; // Formato: 5549991679923 (sem espaços ou caracteres especiais)
    
    @NotBlank(message = "Mensagem é obrigatória")
    private String message;
    
    private UUID leadId; // Opcional: associar mensagem a um lead
}

