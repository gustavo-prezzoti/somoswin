package com.backend.winai.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Análise com IA sobre campanhas Meta (dados reais + prompt).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MetaAdsAiAnalysisRequest {

    /** Filtro igual ao dashboard: Todas | Ativas | Pausadas | Arquivadas */
    private String filterLabel;

    /**
     * Preset (ex.: melhor_ctr, roas_campanha, pausar_quais). Opcional se houver só
     * pergunta livre.
     */
    private String preset;

    /** Pergunta livre do usuário (pode combinar com preset). */
    private String userQuestion;
}
