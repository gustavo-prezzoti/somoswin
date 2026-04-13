package com.backend.winai.dto.whatsapp.broadcast;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActiveBaseDashboardMetricsResponse {

    private long totalContactsInBase;
    private long messagesSentLast30Days;
    private long failedLast30Days;
    /** Pode ser null quando não há modelo de receita. */
    private String estimatedConversionLabel;
}
