package com.backend.winai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MetaAdsAiAnalysisResponse {

    /** Markdown (pt-BR) — números vêm dos factos calculados no servidor. */
    private String analysis;

    /** true quando a resposta foi gerada sem chamada ao modelo (fallback). */
    private boolean fallback;
}
