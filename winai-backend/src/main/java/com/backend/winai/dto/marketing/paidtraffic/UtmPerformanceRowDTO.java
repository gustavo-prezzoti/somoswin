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
    /** Texto do badge [ref=...] */
    private String refLabel;
    /** Linha secundária (ex.: campanha • criativo) */
    private String subtitle;
    private int leads;
    /** CPL em R$ (atribuição proporcional ao gasto Meta no período) */
    private double cpl;
    /** Receita estimada (soma estimated_value dos leads) / gasto atribuído */
    private double roas;
    /** excelente | bom | atenção */
    private String status;
}
