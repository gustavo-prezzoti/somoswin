package com.backend.winai.dto.whatsapp.broadcast;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyWhatsAppInstanceCardResponse {

    private UUID connectionId;
    private String instanceName;
    private String phoneDisplay;
    private String profileName;
    /** ready | warming | paused | unknown */
    private String status;
    private String modeLabel;
    private Integer messagesSent;
    private Integer daysActive;
    private Integer interactionsToday;
    private Integer limitToday;
}
