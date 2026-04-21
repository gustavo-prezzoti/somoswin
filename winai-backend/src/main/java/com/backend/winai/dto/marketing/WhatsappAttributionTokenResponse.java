package com.backend.winai.dto.marketing;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class WhatsappAttributionTokenResponse {
    /** Código curto — use na linha ref:TOKEN na mensagem do anúncio. */
    String token;
    /** Texto sugerido (saudação + linha ref) para colar no Meta. */
    String suggestedMessage;
}
