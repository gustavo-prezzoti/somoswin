package com.backend.winai.util;

import com.backend.winai.dto.marketing.paidtraffic.PaidTrafficAssetRowDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Compara período atual com o período anterior de mesma duração (dia anterior ao início como fim)
 * para preencher variação de ROAS/CPL/CTR e tendência (melhor | estavel | pior).
 */
public final class PaidTrafficTrendUtil {

    private static final Logger log = LoggerFactory.getLogger(PaidTrafficTrendUtil.class);

    private static final double BAND_PCT = 5.0;

    private PaidTrafficTrendUtil() {}

    /** @return [prevStart, prevEnd] inclusive, mesmo número de dias que [start, end]. */
    public static LocalDate[] previousPeriod(LocalDate start, LocalDate end) {
        long days = ChronoUnit.DAYS.between(start, end) + 1;
        if (days < 1) {
            days = 1;
        }
        LocalDate prevEnd = start.minusDays(1);
        LocalDate prevStart = prevEnd.minusDays(days - 1);
        return new LocalDate[]{prevStart, prevEnd};
    }

    /**
     * Preenche {@code roasVariationPct}, {@code cplVariationPct}, {@code ctrVariationPct} e {@code trend}.
     * Sem dados do período anterior, define {@code trend} como {@code estavel}.
     */
    public static void applyTrend(List<PaidTrafficAssetRowDTO> current, List<PaidTrafficAssetRowDTO> previous) {
        if (current == null || current.isEmpty()) {
            return;
        }
        if (previous == null || previous.isEmpty()) {
            log.warn("[PaidTrafficTrend] Sem linhas do período anterior — só tendência estável ({} ativos atuais)", current.size());
            for (PaidTrafficAssetRowDTO row : current) {
                row.setTrend("estavel");
            }
            return;
        }
        Map<String, PaidTrafficAssetRowDTO> prevMap = previous.stream()
                .filter(Objects::nonNull)
                .filter(r -> r.getId() != null)
                .collect(Collectors.toMap(PaidTrafficAssetRowDTO::getId, Function.identity(), (a, b) -> a));
        int matched = 0;
        for (PaidTrafficAssetRowDTO row : current) {
            PaidTrafficAssetRowDTO p = prevMap.get(row.getId());
            if (p == null) {
                log.debug("[PaidTrafficTrend] id={} sem par no período anterior — estavel", row.getId());
                row.setTrend("estavel");
                continue;
            }
            matched++;
            Double roasVar = null;
            if (row.getRoas() != null && p.getRoas() != null && p.getRoas() > 1e-9) {
                roasVar = (row.getRoas() - p.getRoas()) / p.getRoas() * 100.0;
                row.setRoasVariationPct(roasVar);
            }
            Double cplVar = null;
            if (row.getCpl() != null && p.getCpl() != null && p.getCpl() > 1e-9) {
                cplVar = (row.getCpl() - p.getCpl()) / p.getCpl() * 100.0;
                row.setCplVariationPct(cplVar);
            }
            Double ctrVar = null;
            if (row.getCtr() != null && p.getCtr() != null && p.getCtr() > 1e-9) {
                ctrVar = (row.getCtr() - p.getCtr()) / p.getCtr() * 100.0;
                row.setCtrVariationPct(ctrVar);
            }
            String trend = resolveTrend(roasVar, cplVar, ctrVar);
            row.setTrend(trend);
            log.debug("[PaidTrafficTrend] id={} roasAnt={} roasAtu={} Δroas%={} Δcpl%={} Δctr%={} trend={}",
                    row.getId(), p.getRoas(), row.getRoas(), roasVar, cplVar, ctrVar, trend);
        }
        log.info("[PaidTrafficTrend] Comparado: {} ativos com par no período anterior de {} linhas anteriores",
                matched, previous.size());
    }

    private static String resolveTrend(Double roasVarPct, Double cplVarPct, Double ctrVarPct) {
        if (roasVarPct != null && !Double.isNaN(roasVarPct) && !Double.isInfinite(roasVarPct)) {
            if (roasVarPct > BAND_PCT) {
                return "melhor";
            }
            if (roasVarPct < -BAND_PCT) {
                return "pior";
            }
            return "estavel";
        }
        if (cplVarPct != null && !Double.isNaN(cplVarPct) && !Double.isInfinite(cplVarPct)) {
            if (cplVarPct < -BAND_PCT) {
                return "melhor";
            }
            if (cplVarPct > BAND_PCT) {
                return "pior";
            }
            return "estavel";
        }
        if (ctrVarPct != null && !Double.isNaN(ctrVarPct) && !Double.isInfinite(ctrVarPct)) {
            if (ctrVarPct > BAND_PCT) {
                return "melhor";
            }
            if (ctrVarPct < -BAND_PCT) {
                return "pior";
            }
        }
        return "estavel";
    }
}
