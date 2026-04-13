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
public class WhatsAppBroadcastRecipientResponse {

    private UUID id;
    private String contactId;
    private String contactName;
    private String contactInfo;
    private String status;
    private String error;
    private ZonedDateTime timestamp;
}
