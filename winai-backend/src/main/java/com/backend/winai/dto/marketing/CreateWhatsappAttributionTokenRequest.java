package com.backend.winai.dto.marketing;

import lombok.Data;

/** Corpo para criar token de mensagem rastreável (Click-to-WhatsApp). */
@Data
public class CreateWhatsappAttributionTokenRequest {
    /** Primeira linha da mensagem (opcional). Padrão: saudação fixa. */
    private String introLine;
    private String utmSource;
    private String utmMedium;
    private String utmCampaign;
    private String utmContent;
    private String utmTerm;
    private String gclid;
    private String fbclid;
}
