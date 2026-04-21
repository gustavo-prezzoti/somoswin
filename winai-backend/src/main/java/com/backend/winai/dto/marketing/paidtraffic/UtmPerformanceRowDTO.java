package com.backend.winai.dto.marketing.paidtraffic;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UtmPerformanceRowDTO {
    /** Chave interna de agrupamento */
    private String groupKey;
    /** Badge só quando há track/ref: [ref=...] (sem [utm_campaign=id]) */
    private String refLabel;
    /** Nomes resolvidos: campanha • conjunto • anúncio (Meta sync); IDs numéricos viram — se não houver nome */
    private String subtitle;
    private int leads;
    /** CPL em R$ (atribuição proporcional ao gasto Meta no período) */
    private double cpl;
    /** Receita estimada (soma estimated_value dos leads) / gasto atribuído */
    private double roas;
    /** excelente | bom | atenção */
    private String status;

    /** Legado; nomes vêm em {@link #subtitle} */
    private String metaCampaignName;
}
