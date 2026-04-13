package com.backend.winai.dto.marketing.paidtraffic;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UtmPerformanceResponse {
    @Builder.Default
    private List<UtmPerformanceRowDTO> rows = new ArrayList<>();
    /** Maior ROAS entre as linhas (para o chip "Melhor ROAS") */
    private double bestRoas;
    private String startDate;
    private String endDate;
    /** Mensagem quando não há leads com atribuição */
    private String emptyMessage;
}
