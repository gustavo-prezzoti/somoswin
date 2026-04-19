package com.backend.winai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

/**
 * Sessão de Escuta Inteligente no painel admin (inclui empresa).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminEscutaSessionResponse {

    private UUID companyId;
    private String companyName;

    private UUID id;
    private UUID leadId;
    private String leadName;
    private String title;
    private LocalDate meetingDate;
    private LocalTime meetingTime;
    private String status;
    private String statusLabel;
    private LocalDateTime createdAt;
    private String transcriptionFull;
    private String aiSummary;
    private BigDecimal negotiatedValueBrl;
}
