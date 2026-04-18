package com.backend.winai.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IntelligentListeningAiSummaryRequest {

    /** Texto JSON da análise; string vazia remove a análise da sessão. */
    private String aiSummary;
}
