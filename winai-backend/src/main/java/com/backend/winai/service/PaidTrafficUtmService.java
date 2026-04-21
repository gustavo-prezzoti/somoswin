package com.backend.winai.service;

import com.backend.winai.dto.marketing.AccountInsightTotals;
import com.backend.winai.dto.marketing.TrafficMetricsResponse;
import com.backend.winai.dto.marketing.paidtraffic.UtmPerformanceResponse;
import com.backend.winai.dto.marketing.paidtraffic.UtmPerformanceRowDTO;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.Lead;
import com.backend.winai.entity.MetaCampaign;
import com.backend.winai.entity.User;
import com.backend.winai.repository.LeadRepository;
import com.backend.winai.repository.MetaCampaignRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaidTrafficUtmService {

    private final LeadRepository leadRepository;
    private final MarketingService marketingService;
    private final MetaPaidTrafficGraphService metaPaidTrafficGraphService;
    private final MetaCampaignRepository metaCampaignRepository;

    public UtmPerformanceResponse getPerformance(User user, LocalDate startDate, LocalDate endDate) {
        Company company = user.getCompany();
        LocalDate start = startDate != null ? startDate : LocalDate.now().minusDays(29);
        LocalDate end = endDate != null ? endDate : LocalDate.now();
        if (start.isAfter(end)) {
            LocalDate t = start;
            start = end;
            end = t;
        }

        LocalDateTime from = start.atStartOfDay();
        LocalDateTime to = end.plusDays(1).atStartOfDay();

        List<Lead> leads = leadRepository.findByCompanyAndCreatedAtRange(company, from, to);

        Map<String, Agg> byKey = new HashMap<>();
        for (Lead lead : leads) {
            String key = attributionGroupKey(lead);
            if (key == null) {
                continue;
            }
            Agg agg = byKey.computeIfAbsent(key, k -> new Agg());
            agg.leadCount++;
            if (lead.getEstimatedValue() != null) {
                agg.revenue = agg.revenue.add(lead.getEstimatedValue());
            }
            if (agg.sampleCampaign == null && lead.getUtmCampaign() != null && !lead.getUtmCampaign().isBlank()) {
                agg.sampleCampaign = lead.getUtmCampaign().trim();
            }
            if (agg.sampleCreative == null && lead.getUtmContent() != null && !lead.getUtmContent().isBlank()) {
                agg.sampleCreative = lead.getUtmContent().trim();
            }
            if (agg.trackRef == null && lead.getTrackSource() != null && !lead.getTrackSource().isBlank()) {
                agg.trackRef = lead.getTrackSource().trim();
            }
        }

        if (byKey.isEmpty()) {
            return UtmPerformanceResponse.builder()
                    .rows(List.of())
                    .bestRoas(0)
                    .startDate(start.toString())
                    .endDate(end.toString())
                    .emptyMessage("Nenhum lead com rastreamento (ref ou UTM) neste período. "
                            + "O lead precisa enviar a mensagem com a linha ?utm_... (wa.me) para o webhook gravar; "
                            + "amplie o intervalo de datas ou confira se o webhook está salvando o texto da mensagem.")
                    .build();
        }

        double totalSpend = resolveAccountSpendForPeriod(user, start, end);

        long attributedLeads = byKey.values().stream().mapToLong(a -> a.leadCount).sum();
        double spendPool = totalSpend;

        List<UtmPerformanceRowDTO> rows = new ArrayList<>();
        double bestRoas = 0;

        for (Map.Entry<String, Agg> e : byKey.entrySet()) {
            Agg agg = e.getValue();
            double attributedSpend = attributedLeads > 0
                    ? spendPool * (agg.leadCount / (double) attributedLeads)
                    : 0;
            double cpl = agg.leadCount > 0 ? attributedSpend / agg.leadCount : 0;
            double revenue = agg.revenue.doubleValue();
            double roas = attributedSpend > 0.01 ? revenue / attributedSpend : 0;
            if (roas > bestRoas) {
                bestRoas = roas;
            }
            String status = classifyStatus(roas);
            String metaCampaignName = resolveMetaCampaignName(company, e.getKey());
            rows.add(UtmPerformanceRowDTO.builder()
                    .groupKey(e.getKey())
                    .refLabel(buildRefLabel(e.getKey(), agg))
                    .subtitle(buildSubtitle(agg))
                    .leads(agg.leadCount)
                    .cpl(round2(cpl))
                    .roas(round2(roas))
                    .status(status)
                    .metaCampaignName(metaCampaignName)
                    .build());
        }

        rows.sort(Comparator.comparingDouble(UtmPerformanceRowDTO::getRoas).reversed());

        return UtmPerformanceResponse.builder()
                .rows(rows)
                .bestRoas(round2(bestRoas))
                .startDate(start.toString())
                .endDate(end.toString())
                .emptyMessage(null)
                .build();
    }

    private static String attributionGroupKey(Lead l) {
        if (l.getTrackSource() != null && !l.getTrackSource().isBlank()) {
            return "t:" + l.getTrackSource().trim();
        }
        if (l.getUtmCampaign() != null && !l.getUtmCampaign().isBlank()) {
            return "u:" + l.getUtmCampaign().trim();
        }
        if (l.getUtmSource() != null || l.getUtmMedium() != null) {
            return "r:" + String.join("|",
                    Objects.toString(l.getUtmSource(), ""),
                    Objects.toString(l.getUtmMedium(), ""),
                    Objects.toString(l.getUtmCampaign(), ""),
                    Objects.toString(l.getUtmContent(), ""));
        }
        return null;
    }

    private static String buildRefLabel(String key, Agg agg) {
        if (agg.trackRef != null) {
            return "[ref=" + agg.trackRef + "]";
        }
        if (key.startsWith("u:")) {
            return "[utm_campaign=" + key.substring(2) + "]";
        }
        return "[ref=" + key + "]";
    }

    private static String buildSubtitle(Agg agg) {
        String c = agg.sampleCampaign != null ? agg.sampleCampaign : "—";
        String cr = agg.sampleCreative != null ? agg.sampleCreative : "—";
        return c + " • " + cr;
    }

    private String resolveMetaCampaignName(Company company, String groupKey) {
        if (company == null || groupKey == null || !groupKey.startsWith("u:")) {
            return null;
        }
        String metaId = groupKey.substring(2).trim();
        if (metaId.isEmpty()) {
            return null;
        }
        return metaCampaignRepository
                .findByCompany_IdAndMetaId(company.getId(), metaId)
                .map(MetaCampaign::getName)
                .orElse(null);
    }

    private static String classifyStatus(double roas) {
        if (roas >= 4.0) {
            return "excelente";
        }
        if (roas >= 1.5) {
            return "bom";
        }
        return "atenção";
    }

    private static double round2(double v) {
        return BigDecimal.valueOf(v).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    /** Mesmo gasto da Graph que os KPIs / tabela; fallback para insights persistidos. */
    private double resolveAccountSpendForPeriod(User user, LocalDate start, LocalDate end) {
        Optional<AccountInsightTotals> g = metaPaidTrafficGraphService.fetchAccountTotals(user, start, end);
        if (g.isPresent()) {
            return g.get().getSpend();
        }
        TrafficMetricsResponse metrics = marketingService.getTrafficMetrics(user, null, start, end);
        return parseMoney(metrics.getInvestment() != null ? metrics.getInvestment().getValue() : "0");
    }

    private static double parseMoney(String v) {
        if (v == null) {
            return 0;
        }
        String n = v.replace("R$", "").replace(".", "").replace(",", ".").trim();
        try {
            return Double.parseDouble(n);
        } catch (Exception e) {
            return 0;
        }
    }

    private static class Agg {
        int leadCount;
        BigDecimal revenue = BigDecimal.ZERO;
        String sampleCampaign;
        String sampleCreative;
        String trackRef;
    }
}
