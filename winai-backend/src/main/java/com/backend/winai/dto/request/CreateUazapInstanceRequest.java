package com.backend.winai.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateUazapInstanceRequest {

    private String instanceName;
    private String token; // Token específico da instância (opcional, será gerado se não fornecido)
    private String webhookUrl; // URL do webhook para esta instância
    private Boolean qrcode; // Se deve gerar QR Code
    private String integration; // Tipo de integração (WHATSAPP-BAILEYS, WHATSAPP-BUSINESS, etc)
}
