package com.backend.winai.util;

/**
 * Fórmulas alinhadas ao que o app já exibe em {@code TrafficMetricsResponse} / ROAS Global nos KPIs
 * ({@link com.backend.winai.service.MarketingService#mapInsightsToResponse}).
 * <p>
 * Quando a Meta não envia valor monetário em {@code action_values}, o dashboard usa este índice
 * (não é receita real): {@code (conversões × 100) / gasto}.
 */
public final class MetaTrafficKpiFormulas {

    private MetaTrafficKpiFormulas() {}

    /** Mesmo cálculo do ROAS Global na tela de métricas (conta), aplicável por linha para consistência. */
    public static double kpiStyleRoas(long conversions, double spend) {
        if (spend <= 0 || conversions <= 0) {
            return 0;
        }
        return (conversions * 100.0) / spend;
    }
}
