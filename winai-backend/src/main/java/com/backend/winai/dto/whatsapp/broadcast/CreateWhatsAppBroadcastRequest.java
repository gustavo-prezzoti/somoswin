package com.backend.winai.dto.whatsapp.broadcast;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateWhatsAppBroadcastRequest {

    @NotBlank
    @Size(max = 500)
    private String name;

    @NotBlank
    @Size(max = 12000)
    private String messageText;

    /** Regras / prompt da empresa para gerar as mensagens da sequência. */
    @Size(max = 8000)
    private String companyPrompt;

    /** Ex.: America/Sao_Paulo */
    @Size(max = 64)
    private String scheduleTimezone;

    @NotNull
    private UUID connectionId;

    /** Números já normalizados ou brutos (um por entrada). */
    private List<String> phones;

    /** DDI, DDD e telefone separados (validação Brasil quando DDI 55). */
    private List<BroadcastPhonePartDto> phoneParts;

    /** Alternativa: texto multilinha com um número por linha. */
    private String phonesRaw;

    private String imageUrl;
    private String videoUrl;

    @Builder.Default
    private boolean startImmediately = true;

    /** Confirma uso legítimo da base (opt-in). */
    @Builder.Default
    private boolean confirmOptIn = false;
}
