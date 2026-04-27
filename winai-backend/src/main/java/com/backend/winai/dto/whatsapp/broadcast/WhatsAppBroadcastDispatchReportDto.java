package com.backend.winai.dto.whatsapp.broadcast;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WhatsAppBroadcastDispatchReportDto {

    private UUID id;
    private String recipientLabel;
    private int sequenceIndex;
    private int sequenceTotal;
    /** "Enviado" ou "Não enviado" — sem detalhe técnico. */
    private String statusLabel;
    private ZonedDateTime timestamp;
}
