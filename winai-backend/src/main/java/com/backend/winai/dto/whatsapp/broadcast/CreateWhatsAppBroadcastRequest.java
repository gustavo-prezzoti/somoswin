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

    @NotNull
    private UUID connectionId;

    /** Números já normalizados ou brutos (um por entrada). */
    private List<String> phones;

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
