package com.backend.winai.service;

import com.backend.winai.dto.marketing.AiRecommendationDTO;
import com.backend.winai.dto.marketing.CampaignListItemDTO;
import com.backend.winai.dto.marketing.CampaignsListResponse;
import com.backend.winai.dto.marketing.AccountInsightTotals;
import com.backend.winai.dto.marketing.TrafficMetricsResponse;
import com.backend.winai.dto.marketing.paidtraffic.*;
import com.backend.winai.entity.CompanyPaidTrafficTarget;
import com.backend.winai.entity.MetaCampaign;
import com.backend.winai.entity.MetaConnection;
import com.backend.winai.entity.User;
import com.backend.winai.repository.CompanyPaidTrafficTargetRepository;
import com.backend.winai.repository.MetaCampaignRepository;
import com.backend.winai.repository.MetaConnectionRepository;
import com.backend.winai.util.MetaTrafficKpiFormulas;
import com.backend.winai.util.PaidTrafficTrendUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaidTrafficService {

    private final MarketingService marketingService;
    private final MarketingAiRecommendationsService marketingAiRecommendationsService;
    private final MetaPaidTrafficGraphService metaPaidTrafficGraphService;
    private final GoogleAdsService googleAdsService;
    private final CompanyPaidTrafficTargetRepository targetRepository;
    private final MetaCampaignRepository metaCampaignRepository;
    private final MetaConnectionRepository metaConnectionRepository;

    public PaidTrafficOverviewResponse getOverview(User user, PaidTrafficOverviewResponse.Platform platform,
            LocalDate startDate, LocalDate endDate, String campaignId, String adSetId) {
        DateRange dr = resolveDates(user, startDate, endDate);
        if (platform == PaidTrafficOverviewResponse.Platform.GOOGLE) {
            return googleAdsService.buildOverview(user, dr.start(), dr.end(), campaignId, adSetId);
        }
        return buildMetaOverview(user, dr.start(), dr.end(), campaignId, adSetId);
    }

    private record DateRange(LocalDate start, LocalDate end) {}

    private DateRange resolveDates(User user, LocalDate startDate, LocalDate endDate) {
        Map<String, String> range = marketingService.getTrafficMetricsDateRange(user);
        LocalDate min = LocalDate.parse(range.get("minDate"));
        LocalDate max = LocalDate.parse(range.get("maxDate"));
        LocalDate start = startDate != null ? startDate : min;
        LocalDate end = endDate != null ? endDate : max;
        if (start.isBefore(min)) start = min;
        if (end.isAfter(max)) end = max;
        if (start.isAfter(end)) {
            start = min;
            end = max;
        }
        return new DateRange(start, end);
    }

    private PaidTrafficOverviewResponse buildMetaOverview(User user, LocalDate start, LocalDate end,
            String campaignId, String adSetId) {
        Optional<MetaConnection> conn = metaConnectionRepository.findByCompany(user.getCompany())
                .filter(MetaConnection::isConnected)
                .filter(c -> c.getAdAccountId() != null && !c.getAdAccountId().isBlank());

        if (conn.isEmpty()) {
            return PaidTrafficOverviewResponse.builder()
                    .platform(PaidTrafficOverviewResponse.Platform.META)
                    .connected(false)
                    .connectionMessage("Conecte o Meta Ads em Configurações.")
                    .kpis(Collections.emptyList())
                    .budgetPace(null)
                    .insightBanner(PaidTrafficInsightBannerDTO.builder().visible(false).build())
                    .tableLevel(tableLevel(campaignId, adSetId))
                    .rows(Collections.emptyList())
                    .startDate(start.toString())
                    .endDate(end.toString())
                    .build();
        }

        String ym = start.toString().substring(0, 7);
        CompanyPaidTrafficTarget target = targetRepository
                .findByCompany_IdAndYearMonth(user.getCompany().getId(), ym)
                .orElse(null);

        LocalDate[] prevForKpis = PaidTrafficTrendUtil.previousPeriod(start, end);
        Optional<AccountInsightTotals> graphCurrent = metaPaidTrafficGraphService.fetchAccountTotals(user, start, end);
        TrafficMetricsResponse metrics;
        if (graphCurrent.isPresent()) {
            Optional<AccountInsightTotals> graphPrev =
                    metaPaidTrafficGraphService.fetchAccountTotals(user, prevForKpis[0], prevForKpis[1]);
            metrics = marketingService.buildTrafficMetricsFromGraphTotals(
                    graphCurrent.get(),
                    graphPrev.orElseGet(AccountInsightTotals::empty));
            log.debug("[PaidTraffic] KPIs conta via Graph {}..{} (tendência vs {}..{})",
                    start, end, prevForKpis[0], prevForKpis[1]);
        } else {
            log.info("[PaidTraffic] KPIs: fallback insights persistidos (Graph conta indisponível)");
            metrics = marketingService.getTrafficMetrics(user, null, start, end);
        }
        List<PaidTrafficKpiCardDTO> kpis = mapKpis(metrics, target);
        BudgetPaceDTO pace = buildBudgetPace(user, start, end, metrics);
        PaidTrafficInsightBannerDTO banner = buildBanner(user);

        List<PaidTrafficAssetRowDTO> rows;
        String level = tableLevel(campaignId, adSetId);
        boolean usedDbFallback = false;
        if (adSetId != null && !adSetId.isBlank()) {
            rows = metaPaidTrafficGraphService.fetchAds(user, adSetId, start, end);
        } else if (campaignId != null && !campaignId.isBlank()) {
            rows = metaPaidTrafficGraphService.fetchAdSets(user, campaignId, start, end);
        } else {
            rows = metaPaidTrafficGraphService.fetchCampaigns(user, start, end);
            if (rows.isEmpty()) {
                log.info("[PaidTraffic] Graph não retornou campanhas — usando lista do banco (último sync Meta)");
                rows = mapCampaignRowsFromDb(user);
                usedDbFallback = true;
            }
        }

        if (!rows.isEmpty()) {
            if (!usedDbFallback) {
                LocalDate[] prev = PaidTrafficTrendUtil.previousPeriod(start, end);
                List<PaidTrafficAssetRowDTO> prevRows;
                if (adSetId != null && !adSetId.isBlank()) {
                    prevRows = metaPaidTrafficGraphService.fetchAds(user, adSetId, prev[0], prev[1]);
                } else if (campaignId != null && !campaignId.isBlank()) {
                    prevRows = metaPaidTrafficGraphService.fetchAdSets(user, campaignId, prev[0], prev[1]);
                } else {
                    prevRows = metaPaidTrafficGraphService.fetchCampaigns(user, prev[0], prev[1]);
                }
                log.info("[PaidTraffic] Tendência Meta: atual {}..{} vs anterior {}..{} | linhasAtual={} linhasAnt={}",
                        start, end, prev[0], prev[1], rows.size(), prevRows.size());
                PaidTrafficTrendUtil.applyTrend(rows, prevRows);
            } else {
                log.info("[PaidTraffic] Tendência ignorada (fallback DB só) — {} linhas", rows.size());
                PaidTrafficTrendUtil.applyTrend(rows, Collections.emptyList());
            }
        }

        return PaidTrafficOverviewResponse.builder()
                .platform(PaidTrafficOverviewResponse.Platform.META)
                .connected(true)
                .connectionMessage("Meta Ads conectado")
                .kpis(kpis)
                .budgetPace(pace)
                .insightBanner(banner)
                .tableLevel(level)
                .rows(rows)
                .startDate(start.toString())
                .endDate(end.toString())
                .build();
    }

    private String tableLevel(String campaignId, String adSetId) {
        if (adSetId != null && !adSetId.isBlank()) return "ADS";
        if (campaignId != null && !campaignId.isBlank()) return "ADSETS";
        return "CAMPAIGNS";
    }

    /** Fallback quando a Graph não devolve linhas (parâmetros/time_range) mas o sync já trouxe campanhas. */
    private List<PaidTrafficAssetRowDTO> mapCampaignRowsFromDb(User user) {
        CampaignsListResponse resp = marketingService.getCampaignsForCompany(user.getCompany());
        if (resp.getCampaigns() == null) return Collections.emptyList();
        List<PaidTrafficAssetRowDTO> out = new ArrayList<>();
        for (CampaignListItemDTO c : resp.getCampaigns()) {
            Double spend = c.getSpend();
            long conv = c.getConversions() != null ? c.getConversions() : 0L;
            Double roas = (spend != null && spend > 0 && conv > 0)
                    ? MetaTrafficKpiFormulas.kpiStyleRoas(conv, spend)
                    : null;
            out.add(PaidTrafficAssetRowDTO.builder()
                    .id(c.getId())
                    .level(PaidTrafficAssetRowDTO.AssetLevel.CAMPAIGN)
                    .name(c.getName())
                    .status(c.getStatus())
                    .objective(c.getObjective())
                    .dailyBudget(c.getDailyBudget())
                    .spend(spend)
                    .impressions(c.getImpressions())
                    .clicks(c.getClicks() != null ? c.getClicks() : 0L)
                    .ctr(c.getCtr())
                    .conversions(conv)
                    .cpl(c.getCpl())
                    .roas(roas)
                    .build());
        }
        return out;
    }

    private List<PaidTrafficKpiCardDTO> mapKpis(TrafficMetricsResponse m, CompanyPaidTrafficTarget t) {
        if (m == null) return Collections.emptyList();
        var inv = m.getInvestment();
        var roas = m.getRoas();
        var ctr = metricFromClicksImpressions(m);
        var cpl = estimateCpl(m);

        String invGoal = t != null && t.getInvestmentGoal() != null
                ? "Meta: R$ " + String.format(Locale.forLanguageTag("pt-BR"), "%,.2f", t.getInvestmentGoal().doubleValue())
                : null;
        String roasGoal = t != null && t.getRoasGoal() != null
                ? "Meta: " + t.getRoasGoal().doubleValue() + "x"
                : null;
        String cplGoal = t != null && t.getCplGoal() != null
                ? "Meta: R$ " + String.format(Locale.forLanguageTag("pt-BR"), "%,.2f", t.getCplGoal().doubleValue())
                : null;
        String ctrGoal = t != null && t.getCtrGoal() != null
                ? "Meta: " + String.format("%.2f%%", t.getCtrGoal().doubleValue())
                : null;

        return List.of(
                PaidTrafficKpiCardDTO.builder().key("investment").label("Investimento Total")
                        .value(inv != null ? inv.getValue() : "R$ 0,00")
                        .trend(inv != null ? inv.getTrend() : "0%")
                        .trendPositive(inv == null || inv.isPositive())
                        .goalLabel(invGoal).benchmarkLabel("Planejado / conta").build(),
                PaidTrafficKpiCardDTO.builder().key("roas").label("ROAS Global")
                        .value(roas != null ? roas.getValue() : "—")
                        .trend(roas != null ? roas.getTrend() : "0%")
                        .trendPositive(roas == null || roas.isPositive())
                        .goalLabel(roasGoal).benchmarkLabel("Conta de anúncios").build(),
                PaidTrafficKpiCardDTO.builder().key("cpl").label("CPL Médio")
                        .value(cpl)
                        .trend("—")
                        .trendPositive(true)
                        .goalLabel(cplGoal).benchmarkLabel("Período").build(),
                PaidTrafficKpiCardDTO.builder().key("ctr").label("CTR Médio")
                        .value(ctr)
                        .trend("—")
                        .trendPositive(true)
                        .goalLabel(ctrGoal).benchmarkLabel("Período").build());
    }

    private String metricFromClicksImpressions(TrafficMetricsResponse m) {
        try {
            String clicksStr = m.getClicks() != null ? m.getClicks().getValue().replaceAll("[^0-9]", "") : "0";
            String imprStr = m.getImpressions() != null ? m.getImpressions().getValue().replaceAll("[^0-9kM.]", "") : "0";
            long clicks = Long.parseLong(clicksStr.isEmpty() ? "0" : clicksStr);
            double impr = parseCompactNumber(imprStr);
            if (impr <= 0) return "—";
            return String.format(Locale.forLanguageTag("pt-BR"), "%.2f%%", (clicks * 100.0) / impr);
        } catch (Exception e) {
            return "—";
        }
    }

    private double parseCompactNumber(String s) {
        if (s == null || s.isEmpty()) return 0;
        s = s.trim().toLowerCase(Locale.ROOT);
        try {
            if (s.endsWith("m")) return Double.parseDouble(s.replace("m", "")) * 1_000_000;
            if (s.endsWith("k")) return Double.parseDouble(s.replace("k", "")) * 1_000;
            return Double.parseDouble(s.replace(",", "."));
        } catch (Exception e) {
            return 0;
        }
    }

    private String estimateCpl(TrafficMetricsResponse m) {
        try {
            double spend = parseMoney(m.getInvestment() != null ? m.getInvestment().getValue() : "0");
            String convStr = m.getConversations() != null ? m.getConversations().getValue().replaceAll("[^0-9]", "") : "0";
            long conv = Long.parseLong(convStr.isEmpty() ? "0" : convStr);
            if (conv <= 0 || spend <= 0) return "—";
            return "R$ " + String.format(Locale.forLanguageTag("pt-BR"), "%,.2f", spend / conv);
        } catch (Exception e) {
            return "—";
        }
    }

    private double parseMoney(String v) {
        if (v == null) return 0;
        String n = v.replace("R$", "").replace(".", "").replace(",", ".").trim();
        try {
            return Double.parseDouble(n);
        } catch (Exception e) {
            return 0;
        }
    }

    private BudgetPaceDTO buildBudgetPace(User user, LocalDate start, LocalDate end, TrafficMetricsResponse metrics) {
        long daysInPeriod = ChronoUnit.DAYS.between(start, end) + 1;
        if (daysInPeriod <= 0) daysInPeriod = 1;

        double spent = parseMoney(metrics.getInvestment() != null ? metrics.getInvestment().getValue() : "0");

        List<MetaCampaign> campaigns = metaCampaignRepository.findByCompanyId(user.getCompany().getId());
        double dailyBudgetSum = 0;
        for (MetaCampaign c : campaigns) {
            if (c.getDailyBudget() != null && c.getDailyBudget() > 0) {
                dailyBudgetSum += c.getDailyBudget();
            }
        }
        double planned = dailyBudgetSum * daysInPeriod;

        long totalDaysMonth = java.time.YearMonth.from(start).lengthOfMonth();
        double timeElapsedPct = totalDaysMonth > 0 ? (Math.min(daysInPeriod, totalDaysMonth) * 100.0) / totalDaysMonth : 100;
        double pctSpent = planned > 0 ? Math.min(100, (spent / planned) * 100) : (spent > 0 ? 100 : 0);
        double idealDaily = daysInPeriod > 0 ? spent / daysInPeriod : 0;
        double projected = idealDaily * totalDaysMonth;

        String rec;
        if (planned <= 0) {
            rec = "Defina orçamentos diários nas campanhas para acompanhar o ritmo planejado.";
        } else if (pctSpent > timeElapsedPct + 10) {
            rec = "Gasto acima do ritmo esperado para o período. Revise lances e criativos.";
        } else if (pctSpent + 10 < timeElapsedPct) {
            rec = "Gasto abaixo do ritmo do período. Há espaço para escalar testes A/B.";
        } else {
            rec = "Ritmo de gasto alinhado ao período selecionado.";
        }

        return BudgetPaceDTO.builder()
                .spent(spent)
                .planned(planned > 0 ? planned : spent)
                .percentageSpent(Math.round(pctSpent * 10) / 10.0)
                .timeElapsed(Math.round(timeElapsedPct * 10) / 10.0)
                .idealDailyRate(Math.round(idealDaily * 100) / 100.0)
                .projectedEndAmount(Math.round(projected * 100) / 100.0)
                .recommendation(rec)
                .build();
    }

    private PaidTrafficInsightBannerDTO buildBanner(User user) {
        List<AiRecommendationDTO> recs = marketingAiRecommendationsService.getRecommendations(user);
        if (recs == null || recs.isEmpty()) {
            return PaidTrafficInsightBannerDTO.builder().visible(false).build();
        }
        AiRecommendationDTO r = recs.get(0);
        return PaidTrafficInsightBannerDTO.builder()
                .visible(true)
                .title(r.getTitle() != null ? r.getTitle() : "Insight prioritário")
                .description(r.getDescription() != null ? r.getDescription() : "")
                .statusLabel("Recomendação IA")
                .statusValue(r.getActionLabel() != null ? r.getActionLabel() : "Ver detalhes")
                .actionTakenLabel("Tipo")
                .actionTakenValue(r.getType() != null ? r.getType() : "")
                .build();
    }
}
