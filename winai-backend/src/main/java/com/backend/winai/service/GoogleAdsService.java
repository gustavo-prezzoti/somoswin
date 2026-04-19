package com.backend.winai.service;

import com.backend.winai.dto.marketing.GoogleAdsAccessibleAccountDTO;
import com.backend.winai.dto.marketing.paidtraffic.PaidTrafficAssetRowDTO;
import com.backend.winai.dto.marketing.paidtraffic.PaidTrafficInsightBannerDTO;
import com.backend.winai.dto.marketing.paidtraffic.PaidTrafficKpiCardDTO;
import com.backend.winai.dto.marketing.paidtraffic.BudgetPaceDTO;
import com.backend.winai.dto.marketing.paidtraffic.PaidTrafficOverviewResponse;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.CompanyPaidTrafficTarget;
import com.backend.winai.entity.GoogleAdsConnection;
import com.backend.winai.entity.User;
import com.backend.winai.repository.CompanyPaidTrafficTargetRepository;
import com.backend.winai.repository.GoogleAdsConnectionRepository;
import com.backend.winai.util.PaidTrafficTrendUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Google Ads API via REST (googleAds:search). Requer developer token e OAuth refresh token.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GoogleAdsService {

    @Value("${google.client.id:}")
    private String clientId;

    @Value("${google.client.secret:}")
    private String clientSecret;

    @Value("${google.ads.developer-token:}")
    private String developerToken;

    @Value("${google.ads.api.version:v16}")
    private String apiVersion;

    private final GoogleAdsConnectionRepository googleAdsConnectionRepository;
    private final CompanyPaidTrafficTargetRepository paidTrafficTargetRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    public Optional<GoogleAdsConnection> getConnection(Company company) {
        return googleAdsConnectionRepository.findByCompany_Id(company.getId());
    }

    public PaidTrafficOverviewResponse buildOverview(User user, LocalDate start, LocalDate end,
            String campaignResourceName, String adGroupId) {
        Company company = user.getCompany();
        if (developerToken == null || developerToken.isBlank()) {
            return emptyGoogleOverview(
                    "O Google Ads não está disponível no momento. Entre em contato com o suporte se o problema continuar.");
        }
        Optional<GoogleAdsConnection> connOpt = googleAdsConnectionRepository.findByCompany_Id(company.getId());
        if (connOpt.isEmpty() || !connOpt.get().isConnected()
                || connOpt.get().getRefreshToken() == null || connOpt.get().getRefreshToken().isBlank()) {
            return emptyGoogleOverview("Conecte o Google Ads em Configurações.");
        }
        GoogleAdsConnection conn = connOpt.get();
        if (conn.getCustomerId() == null || conn.getCustomerId().isBlank()) {
            return emptyGoogleOverview("Selecione a conta Google Ads em Configurações.");
        }

        String accessToken;
        try {
            accessToken = refreshAccessToken(conn.getRefreshToken());
        } catch (Exception e) {
            log.warn("[GoogleAds] refresh token failed: {}", e.getMessage());
            return emptyGoogleOverview("Falha ao renovar token do Google. Reconecte em Configurações.");
        }

        String cid = conn.getCustomerId().replace("-", "").trim();
        String loginHeader = conn.getLoginCustomerId() != null && !conn.getLoginCustomerId().isBlank()
                ? conn.getLoginCustomerId().replace("-", "").trim()
                : null;

        String ym = start.toString().substring(0, 7);
        CompanyPaidTrafficTarget monthTarget = paidTrafficTargetRepository
                .findByCompany_IdAndYearMonth(user.getCompany().getId(), ym)
                .orElse(null);

        try {
            if (adGroupId != null && !adGroupId.isBlank()) {
                return overviewWithAds(user, accessToken, cid, loginHeader, start, end, adGroupId);
            }
            if (campaignResourceName != null && !campaignResourceName.isBlank()) {
                return overviewWithAdGroups(user, accessToken, cid, loginHeader, start, end, campaignResourceName);
            }
            return overviewCampaigns(user, accessToken, cid, loginHeader, start, end, monthTarget);
        } catch (Exception e) {
            log.warn("[GoogleAds] overview error: {}", e.getMessage());
            return emptyGoogleOverview("Erro ao consultar Google Ads: " + e.getMessage());
        }
    }

    private PaidTrafficOverviewResponse overviewCampaigns(User user, String accessToken, String customerId,
            String loginCustomerId, LocalDate start, LocalDate end, CompanyPaidTrafficTarget monthTarget)
            throws Exception {
        String q = String.format(
                "SELECT campaign.id, campaign.name, campaign.status, "
                        + "metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions, "
                        + "metrics.ctr, metrics.cost_per_conversion, metrics.conversions_value "
                        + "FROM campaign "
                        + "WHERE campaign.status != 'REMOVED' "
                        + "AND segments.date BETWEEN '%s' AND '%s'",
                start, end);

        JsonNode root = search(accessToken, customerId, loginCustomerId, q);
        List<PaidTrafficAssetRowDTO> rows = mapCampaignResults(root);
        double totalSpend = 0;
        long totalClicks = 0;
        long totalImpr = 0;
        double totalConv = 0;
        double totalValue = 0;
        for (PaidTrafficAssetRowDTO row : rows) {
            totalSpend += row.getSpend() != null ? row.getSpend() : 0;
            totalClicks += row.getClicks() != null ? row.getClicks() : 0;
            totalImpr += row.getImpressions() != null ? row.getImpressions() : 0;
            totalConv += row.getConversions() != null ? row.getConversions() : 0;
            if (row.getSpend() != null && row.getRoas() != null && row.getRoas() > 0) {
                totalValue += row.getSpend() * row.getRoas();
            }
        }

        LocalDate[] prev = PaidTrafficTrendUtil.previousPeriod(start, end);
        String qPrev = String.format(
                "SELECT campaign.id, campaign.name, campaign.status, "
                        + "metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions, "
                        + "metrics.ctr, metrics.cost_per_conversion, metrics.conversions_value "
                        + "FROM campaign "
                        + "WHERE campaign.status != 'REMOVED' "
                        + "AND segments.date BETWEEN '%s' AND '%s'",
                prev[0], prev[1]);
        JsonNode prevRoot = search(accessToken, customerId, loginCustomerId, qPrev);
        PaidTrafficTrendUtil.applyTrend(rows, mapCampaignResults(prevRoot));

        double roasGlobal = totalSpend > 0 && totalValue > 0 ? totalValue / totalSpend : 0;
        double ctrAvg = totalImpr > 0 ? (totalClicks * 100.0) / totalImpr : 0;
        double cplAvg = totalConv > 0 ? totalSpend / totalConv : 0;

        List<PaidTrafficKpiCardDTO> kpis = buildKpis(totalSpend, roasGlobal, cplAvg, ctrAvg, monthTarget);
        BudgetPaceDTO pace = buildBudgetPacePlaceholder(totalSpend, start, end);

        return PaidTrafficOverviewResponse.builder()
                .platform(PaidTrafficOverviewResponse.Platform.GOOGLE)
                .connected(true)
                .connectionMessage("Google Ads conectado")
                .kpis(kpis)
                .budgetPace(pace)
                .insightBanner(PaidTrafficInsightBannerDTO.builder().visible(false).build())
                .tableLevel("CAMPAIGNS")
                .rows(rows)
                .startDate(start.toString())
                .endDate(end.toString())
                .build();
    }

    private List<PaidTrafficAssetRowDTO> mapCampaignResults(JsonNode root) {
        List<PaidTrafficAssetRowDTO> rows = new ArrayList<>();
        if (root == null || !root.has("results")) {
            return rows;
        }
        for (JsonNode r : root.get("results")) {
            JsonNode c = r.get("campaign");
            JsonNode m = r.get("metrics");
            if (c == null || m == null) continue;
            long id = c.path("id").asLong(0);
            String name = c.path("name").asText("");
            String status = c.path("status").asText("");
            double cost = parseCostMicros(m) / 1_000_000.0;
            long clicks = m.path("clicks").asLong(0);
            long imps = m.path("impressions").asLong(0);
            double conv = m.path("conversions").asDouble(0);
            double ctr = m.path("ctr").asDouble(0) * 100;
            Double cpl = conv > 0 ? cost / conv : null;
            double val = parseConversionsValue(m);
            Double roas = cost > 0 && val > 0 ? val / cost : null;
            rows.add(PaidTrafficAssetRowDTO.builder()
                    .id(String.valueOf(id))
                    .level(PaidTrafficAssetRowDTO.AssetLevel.CAMPAIGN)
                    .name(name)
                    .status(status)
                    .objective("GOOGLE")
                    .spend(cost)
                    .impressions(imps)
                    .clicks(clicks)
                    .ctr(ctr)
                    .conversions(Math.round(conv))
                    .cpl(cpl != null && !Double.isNaN(cpl) ? cpl : null)
                    .roas(roas)
                    .build());
        }
        return rows;
    }

    private PaidTrafficOverviewResponse overviewWithAdGroups(User user, String accessToken, String customerId,
            String loginCustomerId, LocalDate start, LocalDate end, String campaignId) throws Exception {
        String q = String.format(
                "SELECT ad_group.id, ad_group.name, ad_group.status, "
                        + "metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions, "
                        + "metrics.ctr, metrics.cost_per_conversion, metrics.conversions_value "
                        + "FROM ad_group "
                        + "WHERE campaign.id = %s AND ad_group.status != 'REMOVED' "
                        + "AND segments.date BETWEEN '%s' AND '%s'",
                campaignId.replaceAll("[^0-9]", ""), start, end);

        JsonNode root = search(accessToken, customerId, loginCustomerId, q);
        List<PaidTrafficAssetRowDTO> rows = mapAdGroupResults(root);
        LocalDate[] prev = PaidTrafficTrendUtil.previousPeriod(start, end);
        String qPrev = String.format(
                "SELECT ad_group.id, ad_group.name, ad_group.status, "
                        + "metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions, "
                        + "metrics.ctr, metrics.cost_per_conversion, metrics.conversions_value "
                        + "FROM ad_group "
                        + "WHERE campaign.id = %s AND ad_group.status != 'REMOVED' "
                        + "AND segments.date BETWEEN '%s' AND '%s'",
                campaignId.replaceAll("[^0-9]", ""), prev[0], prev[1]);
        JsonNode prevRoot = search(accessToken, customerId, loginCustomerId, qPrev);
        PaidTrafficTrendUtil.applyTrend(rows, mapAdGroupResults(prevRoot));
        return PaidTrafficOverviewResponse.builder()
                .platform(PaidTrafficOverviewResponse.Platform.GOOGLE)
                .connected(true)
                .connectionMessage("Google Ads")
                .kpis(Collections.emptyList())
                .budgetPace(null)
                .insightBanner(PaidTrafficInsightBannerDTO.builder().visible(false).build())
                .tableLevel("ADSETS")
                .rows(rows)
                .startDate(start.toString())
                .endDate(end.toString())
                .build();
    }

    private PaidTrafficOverviewResponse overviewWithAds(User user, String accessToken, String customerId,
            String loginCustomerId, LocalDate start, LocalDate end, String adGroupId) throws Exception {
        String q = String.format(
                "SELECT ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.status, "
                        + "metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions, "
                        + "metrics.ctr, metrics.cost_per_conversion, metrics.conversions_value "
                        + "FROM ad_group_ad "
                        + "WHERE ad_group.id = %s "
                        + "AND segments.date BETWEEN '%s' AND '%s'",
                adGroupId.replaceAll("[^0-9]", ""), start, end);

        JsonNode root = search(accessToken, customerId, loginCustomerId, q);
        List<PaidTrafficAssetRowDTO> rows = mapAdResults(root);
        LocalDate[] prev = PaidTrafficTrendUtil.previousPeriod(start, end);
        String qPrev = String.format(
                "SELECT ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.status, "
                        + "metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions, "
                        + "metrics.ctr, metrics.cost_per_conversion, metrics.conversions_value "
                        + "FROM ad_group_ad "
                        + "WHERE ad_group.id = %s "
                        + "AND segments.date BETWEEN '%s' AND '%s'",
                adGroupId.replaceAll("[^0-9]", ""), prev[0], prev[1]);
        JsonNode prevRoot = search(accessToken, customerId, loginCustomerId, qPrev);
        PaidTrafficTrendUtil.applyTrend(rows, mapAdResults(prevRoot));
        return PaidTrafficOverviewResponse.builder()
                .platform(PaidTrafficOverviewResponse.Platform.GOOGLE)
                .connected(true)
                .connectionMessage("Google Ads")
                .kpis(Collections.emptyList())
                .budgetPace(null)
                .insightBanner(PaidTrafficInsightBannerDTO.builder().visible(false).build())
                .tableLevel("ADS")
                .rows(rows)
                .startDate(start.toString())
                .endDate(end.toString())
                .build();
    }

    private List<PaidTrafficAssetRowDTO> mapAdResults(JsonNode root) {
        List<PaidTrafficAssetRowDTO> rows = new ArrayList<>();
        if (root == null || !root.has("results")) {
            return rows;
        }
        for (JsonNode r : root.get("results")) {
            JsonNode aga = r.get("adGroupAd");
            if (aga == null) continue;
            JsonNode ad = aga.get("ad");
            JsonNode m = r.get("metrics");
            if (ad == null || m == null) continue;
            long id = ad.path("id").asLong(0);
            String name = ad.path("name").asText("");
            String status = aga.path("status").asText("");
            double cost = parseCostMicros(m) / 1_000_000.0;
            long clicks = m.path("clicks").asLong(0);
            long imps = m.path("impressions").asLong(0);
            double conv = m.path("conversions").asDouble(0);
            double ctr = m.path("ctr").asDouble(0) * 100;
            double val = parseConversionsValue(m);
            Double roas = cost > 0 && val > 0 ? val / cost : null;
            Double cpl = conv > 0 ? cost / conv : null;
            rows.add(PaidTrafficAssetRowDTO.builder()
                    .id(String.valueOf(id))
                    .level(PaidTrafficAssetRowDTO.AssetLevel.AD)
                    .name(name)
                    .status(status)
                    .spend(cost)
                    .impressions(imps)
                    .clicks(clicks)
                    .ctr(ctr)
                    .conversions(Math.round(conv))
                    .cpl(cpl)
                    .roas(roas)
                    .build());
        }
        return rows;
    }

    private List<PaidTrafficAssetRowDTO> mapAdGroupResults(JsonNode root) {
        List<PaidTrafficAssetRowDTO> rows = new ArrayList<>();
        if (!root.has("results")) return rows;
        for (JsonNode r : root.get("results")) {
            JsonNode g = r.get("adGroup");
            JsonNode m = r.get("metrics");
            if (g == null || m == null) continue;
            long id = g.path("id").asLong(0);
            String name = g.path("name").asText("");
            String status = g.path("status").asText("");
            double cost = parseCostMicros(m) / 1_000_000.0;
            long clicks = m.path("clicks").asLong(0);
            long imps = m.path("impressions").asLong(0);
            double conv = m.path("conversions").asDouble(0);
            double ctr = m.path("ctr").asDouble(0) * 100;
            double val = parseConversionsValue(m);
            Double roas = cost > 0 && val > 0 ? val / cost : null;
            Double cpl = conv > 0 ? cost / conv : null;
            rows.add(PaidTrafficAssetRowDTO.builder()
                    .id(String.valueOf(id))
                    .level(PaidTrafficAssetRowDTO.AssetLevel.ADSET)
                    .name(name)
                    .status(status)
                    .spend(cost)
                    .impressions(imps)
                    .clicks(clicks)
                    .ctr(ctr)
                    .conversions(Math.round(conv))
                    .cpl(cpl)
                    .roas(roas)
                    .build());
        }
        return rows;
    }

    /** GAQL retorna conversions_value; o JSON pode vir em camelCase ou snake_case conforme versão. */
    private double parseConversionsValue(JsonNode m) {
        double v = m.path("conversionsValue").asDouble(0);
        if (v > 0) return v;
        return m.path("conversions_value").asDouble(0);
    }

    private long parseCostMicros(JsonNode m) {
        JsonNode n = m.path("costMicros");
        if (n.isMissingNode() || n.isNull()) return 0;
        if (n.isTextual()) {
            try {
                return Long.parseLong(n.asText());
            } catch (NumberFormatException e) {
                return 0;
            }
        }
        return n.asLong(0);
    }

    private List<PaidTrafficKpiCardDTO> buildKpis(double spend, double roas, double cpl, double ctr,
            CompanyPaidTrafficTarget target) {
        String invGoal = target != null && target.getInvestmentGoal() != null
                ? "Meta: R$ " + String.format(Locale.forLanguageTag("pt-BR"), "%,.2f", target.getInvestmentGoal().doubleValue())
                : null;
        String roasGoal = target != null && target.getRoasGoal() != null
                ? "Meta: " + target.getRoasGoal().doubleValue() + "x"
                : null;
        String cplGoal = target != null && target.getCplGoal() != null
                ? "Meta: R$ " + String.format(Locale.forLanguageTag("pt-BR"), "%,.2f", target.getCplGoal().doubleValue())
                : null;
        String ctrGoal = target != null && target.getCtrGoal() != null
                ? "Meta: " + String.format("%.2f%%", target.getCtrGoal().doubleValue())
                : null;

        return List.of(
                PaidTrafficKpiCardDTO.builder().key("investment").label("Investimento Total")
                        .value("R$ " + String.format(Locale.forLanguageTag("pt-BR"), "%,.2f", spend))
                        .trend("—").trendPositive(true).goalLabel(invGoal).benchmarkLabel("Período selecionado").build(),
                PaidTrafficKpiCardDTO.builder().key("roas").label("ROAS Global")
                        .value(roas > 0 ? String.format("%.1fx", roas) : "—")
                        .trend("—").trendPositive(true).goalLabel(roasGoal).benchmarkLabel("Google Ads").build(),
                PaidTrafficKpiCardDTO.builder().key("cpl").label("CPL Médio")
                        .value(cpl > 0 ? "R$ " + String.format(Locale.forLanguageTag("pt-BR"), "%,.2f", cpl) : "—")
                        .trend("—").trendPositive(true).goalLabel(cplGoal).benchmarkLabel("Conta").build(),
                PaidTrafficKpiCardDTO.builder().key("ctr").label("CTR Médio")
                        .value(String.format("%.2f%%", ctr))
                        .trend("—").trendPositive(true).goalLabel(ctrGoal).benchmarkLabel("Conta").build());
    }

    private BudgetPaceDTO buildBudgetPacePlaceholder(double spent, LocalDate start, LocalDate end) {
        long days = ChronoUnit.DAYS.between(start, end) + 1;
        double planned = spent > 0 ? spent * 1.1 : 1000;
        double pctTime = 100;
        double pctSpent = 100;
        return BudgetPaceDTO.builder()
                .spent(spent)
                .planned(planned)
                .percentageSpent(pctSpent)
                .timeElapsed(pctTime)
                .idealDailyRate(days > 0 ? spent / days : 0)
                .projectedEndAmount(spent)
                .recommendation("Valores de ritmo refletem o período selecionado na conta Google Ads.")
                .build();
    }

    private PaidTrafficOverviewResponse emptyGoogleOverview(String msg) {
        return PaidTrafficOverviewResponse.builder()
                .platform(PaidTrafficOverviewResponse.Platform.GOOGLE)
                .connected(false)
                .connectionMessage(msg)
                .kpis(Collections.emptyList())
                .budgetPace(null)
                .insightBanner(PaidTrafficInsightBannerDTO.builder().visible(false).build())
                .tableLevel("CAMPAIGNS")
                .rows(Collections.emptyList())
                .build();
    }

    private JsonNode search(String accessToken, String customerId, String loginCustomerId, String query)
            throws Exception {
        String url = String.format("https://googleads.googleapis.com/%s/customers/%s/googleAds:search",
                apiVersion, customerId);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(accessToken);
        headers.add("developer-token", developerToken);
        if (loginCustomerId != null) {
            headers.add("login-customer-id", loginCustomerId);
        }
        Map<String, String> body = Map.of("query", query);
        String json = objectMapper.writeValueAsString(body);
        HttpEntity<String> entity = new HttpEntity<>(json, headers);
        ResponseEntity<String> res = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
        JsonNode root = objectMapper.readTree(res.getBody());
        if (root.has("error")) {
            throw new IllegalStateException(root.get("error").toString());
        }
        return root;
    }

    private String refreshAccessToken(String refreshToken) throws Exception {
        if (clientId.isEmpty() || clientSecret.isEmpty()) {
            throw new IllegalStateException("Google OAuth não configurado");
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        MultiValueMap<String, String> map = new LinkedMultiValueMap<>();
        map.add("client_id", clientId);
        map.add("client_secret", clientSecret);
        map.add("refresh_token", refreshToken);
        map.add("grant_type", "refresh_token");
        HttpEntity<MultiValueMap<String, String>> req = new HttpEntity<>(map, headers);
        ResponseEntity<String> res = restTemplate.postForEntity(
                "https://oauth2.googleapis.com/token", req, String.class);
        JsonNode node = objectMapper.readTree(res.getBody());
        if (node.has("error")) {
            throw new IllegalStateException(node.path("error_description").asText("token error"));
        }
        return node.get("access_token").asText();
    }

    /**
     * Contas que o OAuth pode acessar (listAccessibleCustomers + nome / tipo).
     */
    public List<GoogleAdsAccessibleAccountDTO> listAccessibleAccounts(User user) {
        List<GoogleAdsAccessibleAccountDTO> out = new ArrayList<>();
        if (developerToken == null || developerToken.isBlank()) {
            return out;
        }
        Optional<GoogleAdsConnection> connOpt = googleAdsConnectionRepository.findByCompany_Id(user.getCompany().getId());
        if (connOpt.isEmpty() || !connOpt.get().isConnected()
                || connOpt.get().getRefreshToken() == null || connOpt.get().getRefreshToken().isBlank()) {
            return out;
        }
        try {
            String accessToken = refreshAccessToken(connOpt.get().getRefreshToken());
            for (String rn : fetchAccessibleCustomerResourceNames(accessToken)) {
                String id = parseCustomerIdFromResourceName(rn);
                if (id != null) {
                    out.add(fetchAccountMeta(accessToken, id));
                }
            }
            out.sort(Comparator.comparing(GoogleAdsAccessibleAccountDTO::getDescriptiveName, String.CASE_INSENSITIVE_ORDER));
        } catch (Exception e) {
            log.warn("[GoogleAds] list accessible accounts: {}", e.getMessage());
        }
        return out;
    }

    /**
     * Após OAuth, escolhe automaticamente uma conta (prioriza contas não gestoras).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = false)
    public void tryAutoSelectCustomerAfterOAuth(Company company) {
        if (developerToken == null || developerToken.isBlank()) {
            return;
        }
        Optional<GoogleAdsConnection> connOpt = googleAdsConnectionRepository.findByCompany_Id(company.getId());
        if (connOpt.isEmpty() || !connOpt.get().isConnected()) {
            return;
        }
        GoogleAdsConnection conn = connOpt.get();
        if (conn.getCustomerId() != null && !conn.getCustomerId().isBlank()) {
            return;
        }
        if (conn.getRefreshToken() == null || conn.getRefreshToken().isBlank()) {
            return;
        }
        try {
            String accessToken = refreshAccessToken(conn.getRefreshToken());
            List<GoogleAdsAccessibleAccountDTO> accounts = new ArrayList<>();
            for (String rn : fetchAccessibleCustomerResourceNames(accessToken)) {
                String id = parseCustomerIdFromResourceName(rn);
                if (id != null) {
                    accounts.add(fetchAccountMeta(accessToken, id));
                }
            }
            GoogleAdsAccessibleAccountDTO best = pickPreferredAccount(accounts);
            if (best != null) {
                conn.setCustomerId(best.getCustomerId());
                conn.setLoginCustomerId(null);
                googleAdsConnectionRepository.save(conn);
                log.info("[GoogleAds] Conta padrão selecionada automaticamente: {} ({})",
                        best.getDescriptiveName(), best.getCustomerId());
            }
        } catch (Exception e) {
            log.warn("[GoogleAds] auto-select customer: {}", e.getMessage());
        }
    }

    private GoogleAdsAccessibleAccountDTO pickPreferredAccount(List<GoogleAdsAccessibleAccountDTO> accounts) {
        if (accounts.isEmpty()) {
            return null;
        }
        return accounts.stream()
                .filter(a -> !a.isManager())
                .findFirst()
                .orElse(accounts.get(0));
    }

    private List<String> fetchAccessibleCustomerResourceNames(String accessToken) throws Exception {
        String url = String.format("https://googleads.googleapis.com/%s/customers:listAccessibleCustomers", apiVersion);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(accessToken);
        headers.add("developer-token", developerToken);
        HttpEntity<String> entity = new HttpEntity<>("{}", headers);
        ResponseEntity<String> res = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
        JsonNode root = objectMapper.readTree(res.getBody());
        if (root.has("error")) {
            throw new IllegalStateException(root.get("error").toString());
        }
        List<String> names = new ArrayList<>();
        JsonNode arr = root.path("resourceNames");
        if (arr.isArray()) {
            for (JsonNode n : arr) {
                names.add(n.asText());
            }
        }
        return names;
    }

    private String parseCustomerIdFromResourceName(String resourceName) {
        if (resourceName == null || !resourceName.startsWith("customers/")) {
            return null;
        }
        String id = resourceName.substring("customers/".length()).replace("-", "").trim();
        return id.matches("\\d+") ? id : null;
    }

    private GoogleAdsAccessibleAccountDTO fetchAccountMeta(String accessToken, String customerIdDigits) {
        try {
            String q = "SELECT customer.id, customer.descriptive_name, customer.manager FROM customer";
            JsonNode root = search(accessToken, customerIdDigits, null, q);
            JsonNode results = root.path("results");
            if (!results.isArray() || results.isEmpty()) {
                return GoogleAdsAccessibleAccountDTO.builder()
                        .customerId(customerIdDigits)
                        .descriptiveName("Conta " + customerIdDigits)
                        .manager(false)
                        .build();
            }
            JsonNode c = results.get(0).path("customer");
            String name = c.path("descriptiveName").asText("");
            if (name.isBlank()) {
                name = c.path("descriptive_name").asText("");
            }
            if (name.isBlank()) {
                name = "Conta " + customerIdDigits;
            }
            boolean manager = c.path("manager").asBoolean(false);
            String idStr = c.path("id").isMissingNode() || c.path("id").isNull()
                    ? customerIdDigits
                    : c.path("id").asText().replace("-", "");
            if (idStr.isBlank()) {
                idStr = customerIdDigits;
            }
            return GoogleAdsAccessibleAccountDTO.builder()
                    .customerId(idStr)
                    .descriptiveName(name)
                    .manager(manager)
                    .build();
        } catch (Exception e) {
            log.debug("[GoogleAds] meta for {}: {}", customerIdDigits, e.getMessage());
            return GoogleAdsAccessibleAccountDTO.builder()
                    .customerId(customerIdDigits)
                    .descriptiveName("Conta " + customerIdDigits)
                    .manager(false)
                    .build();
        }
    }
}
