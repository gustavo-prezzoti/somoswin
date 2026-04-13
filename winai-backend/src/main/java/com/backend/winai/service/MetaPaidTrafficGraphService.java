package com.backend.winai.service;

import com.backend.winai.dto.marketing.AccountInsightTotals;
import com.backend.winai.dto.marketing.paidtraffic.PaidTrafficAssetRowDTO;
import com.backend.winai.entity.MetaConnection;
import com.backend.winai.entity.User;
import com.backend.winai.repository.MetaConnectionRepository;
import com.backend.winai.util.MetaTrafficKpiFormulas;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Busca conjuntos de anúncios e anúncios na Graph API com insights no período (on-demand).
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class MetaPaidTrafficGraphService {

    @Value("${meta.api.base-url:https://graph.facebook.com/v19.0}")
    private String metaApiBaseUrl;

    private final MetaConnectionRepository metaConnectionRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Campanhas da conta com insights no período (mesma base que drill em conjuntos/anúncios).
     */
    public List<PaidTrafficAssetRowDTO> fetchCampaigns(User user, LocalDate start, LocalDate end) {
        Optional<MetaConnection> conn = connection(user);
        if (conn.isEmpty()) return List.of();
        String aid = normalizeAdAccountId(conn.get().getAdAccountId());
        String token = conn.get().getAccessToken();
        // 1) insights.time_range({...}) no field graph — é o que a Meta aplica de fato ao período (igual ad sets).
        //    time_range só na query da edge /campaigns costuma ser ignorado para o sub-recurso insights → dados “gerais”.
        String urlEmbedded = buildGraphUrl(aid + "/campaigns", buildCampaignFieldsEmbeddedTimeRange(start, end),
                token, null, null);
        List<PaidTrafficAssetRowDTO> rows = fetchAllPages(urlEmbedded, PaidTrafficAssetRowDTO.AssetLevel.CAMPAIGN);
        if (!rows.isEmpty()) {
            return rows;
        }
        // 2) Fallback: time_range na URL + insights{...}
        String fields = buildCampaignInsightFields();
        String urlQuery = buildGraphUrl(aid + "/campaigns", fields, token, start, end);
        return fetchAllPages(urlQuery, PaidTrafficAssetRowDTO.AssetLevel.CAMPAIGN);
    }

    public List<PaidTrafficAssetRowDTO> fetchAdSets(User user, String campaignMetaId, LocalDate start, LocalDate end) {
        Optional<MetaConnection> conn = connection(user);
        if (conn.isEmpty()) return List.of();
        String cid = normalizeId(campaignMetaId);
        String token = conn.get().getAccessToken();
        if (cid == null || cid.isBlank()) {
            log.warn("[MetaPaidTrafficGraph] fetchAdSets: campaignId vazio");
            return List.of();
        }

        // 1) Insights com time_range no campo (o que a Meta documenta para sub-recursos — /adsets ignora time_range na query com frequência)
        List<PaidTrafficAssetRowDTO> rows = fetchAllPages(
                buildGraphUrl(cid + "/adsets", buildAdSetFieldsEmbeddedTimeRange(start, end, true), token, null, null),
                PaidTrafficAssetRowDTO.AssetLevel.ADSET);
        if (!rows.isEmpty()) {
            return rows;
        }
        // 2) time_range na URL + insights{...}
        rows = fetchAllPages(
                buildGraphUrl(cid + "/adsets", buildAdSetOrAdInsightFields(true), token, start, end),
                PaidTrafficAssetRowDTO.AssetLevel.ADSET);
        if (!rows.isEmpty()) {
            return rows;
        }
        // 3) Lista conjuntos sem insights do período (drill-down funciona; métricas podem ficar zeradas)
        log.info("[MetaPaidTrafficGraph] adsets: listando sem insights para campanha {}", cid);
        return fetchAllPages(
                buildGraphUrl(cid + "/adsets", "id,name,status,effective_status,daily_budget", token, null, null),
                PaidTrafficAssetRowDTO.AssetLevel.ADSET);
    }

    public List<PaidTrafficAssetRowDTO> fetchAds(User user, String adSetMetaId, LocalDate start, LocalDate end) {
        Optional<MetaConnection> conn = connection(user);
        if (conn.isEmpty()) return List.of();
        String aid = normalizeId(adSetMetaId);
        String token = conn.get().getAccessToken();
        if (aid == null || aid.isBlank()) {
            log.warn("[MetaPaidTrafficGraph] fetchAds: adSetId vazio");
            return List.of();
        }

        List<PaidTrafficAssetRowDTO> rows = fetchAllPages(
                buildGraphUrl(aid + "/ads", buildAdSetFieldsEmbeddedTimeRange(start, end, false), token, null, null),
                PaidTrafficAssetRowDTO.AssetLevel.AD);
        if (!rows.isEmpty()) {
            return rows;
        }
        rows = fetchAllPages(
                buildGraphUrl(aid + "/ads", buildAdSetOrAdInsightFields(false), token, start, end),
                PaidTrafficAssetRowDTO.AssetLevel.AD);
        if (!rows.isEmpty()) {
            return rows;
        }
        log.info("[MetaPaidTrafficGraph] ads: listando sem insights para adset {}", aid);
        List<PaidTrafficAssetRowDTO> minimal = fetchAllPages(
                buildGraphUrl(aid + "/ads", "id,name,status,effective_status", token, null, null),
                PaidTrafficAssetRowDTO.AssetLevel.AD);
        if (!minimal.isEmpty()) {
            return minimal;
        }
        return fetchAllPages(
                buildGraphUrl(aid + "/ads", "id,name,status", token, null, null),
                PaidTrafficAssetRowDTO.AssetLevel.AD);
    }

    private Optional<MetaConnection> connection(User user) {
        return metaConnectionRepository.findByCompany(user.getCompany())
                .filter(MetaConnection::isConnected)
                .filter(c -> c.getAccessToken() != null && !c.getAccessToken().isBlank());
    }

    private String normalizeId(String id) {
        if (id == null || id.isBlank()) return id;
        id = id.trim();
        if (id.contains("/")) {
            String[] p = id.split("/");
            return p[p.length - 1].trim();
        }
        return id;
    }

    /** Contas de anúncios devem usar o prefixo act_ na Graph API. */
    private String normalizeAdAccountId(String raw) {
        String s = normalizeId(raw);
        if (s == null || s.isBlank()) return s;
        if (s.startsWith("act_")) return s;
        if (s.chars().allMatch(Character::isDigit)) {
            return "act_" + s;
        }
        return s;
    }

    /**
     * A Graph API tokeniza {@code fields} em vírgulas literais. {@code URLEncoder} codifica {@code ,}
     * como {@code %2C}, e o parser retorna erro 2500 ("Expected end of string instead of '%'").
     * Preservamos vírgulas; codificamos só o mínimo necessário na query.
     * <p>
     * Chaves e parênteses precisam ser {@code %7B}/{@code %7D}/{@code %28}/{@code %29}: caso contrário o
     * {@link RestTemplate} interpreta {@code {...}} como variáveis de URI template do Spring
     * ("Not enough variable values available to expand 'since'").
     */
    private static String encodeGraphQueryComponent(String value) {
        if (value == null || value.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder(value.length() + 24);
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            switch (c) {
                case ',' -> sb.append(',');
                case '%' -> sb.append("%25");
                case '&' -> sb.append("%26");
                case '#' -> sb.append("%23");
                case ' ' -> sb.append("%20");
                case '"' -> sb.append("%22");
                case '+' -> sb.append("%2B");
                case '?' -> sb.append("%3F");
                case '/' -> sb.append("%2F");
                case '{' -> sb.append("%7B");
                case '}' -> sb.append("%7D");
                case '(' -> sb.append("%28");
                case ')' -> sb.append("%29");
                default -> {
                    if (c < 0x20 || c == 0x7F) {
                        sb.append(String.format("%%%02X", (int) c));
                    } else if (c > 0x7F) {
                        for (byte b : Character.toString(c).getBytes(StandardCharsets.UTF_8)) {
                            sb.append(String.format("%%%02X", b & 0xff));
                        }
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.toString();
    }

    /**
     * Mesmo padrão do {@link MetaSyncService}: insights aninhados + filtro de data no nível da URL
     * ({@code date_preset} lá; aqui {@code time_range} JSON para o período escolhido).
     */
    private String buildGraphUrl(String path, String fields, String accessToken, LocalDate start, LocalDate end) {
        StringBuilder sb = new StringBuilder(metaApiBaseUrl).append("/").append(path)
                .append("?fields=").append(encodeGraphQueryComponent(fields))
                .append("&limit=500");
        if (start != null && end != null) {
            String trJson = "{\"since\":\"" + start + "\",\"until\":\"" + end + "\"}";
            sb.append("&time_range=").append(encodeGraphQueryComponent(trJson));
        }
        sb.append("&access_token=").append(URLEncoder.encode(accessToken, StandardCharsets.UTF_8));
        return sb.toString();
    }

    private static final String INSIGHT_SUBFIELDS_ACCOUNTING = "spend,impressions,reach,clicks,ctr,actions,action_values";

    /** Uma linha de insight (campanha/ad ou conta) já parseada. */
    private record ParsedInsight(double spend, long impressions, long clicks, double ctr, long conversions, double purchaseValue) {
        static ParsedInsight empty() {
            return new ParsedInsight(0, 0, 0, 0, 0, 0);
        }
    }
    private static final String INSIGHT_SUBFIELDS_ADSET_AD = "spend,impressions,clicks,ctr,actions,action_values";

    private String buildCampaignInsightFields() {
        return "id,name,status,effective_status,objective,daily_budget,insights{" + INSIGHT_SUBFIELDS_ACCOUNTING + "}";
    }

    /** Sintaxe alternativa documentada na Meta (aspas simples nos literais de data). */
    private static String embeddedInsightTimeRange(LocalDate start, LocalDate end) {
        return "time_range({'since':'" + start + "','until':'" + end + "'})";
    }

    private String buildCampaignFieldsEmbeddedTimeRange(LocalDate start, LocalDate end) {
        String tr = embeddedInsightTimeRange(start, end);
        return "id,name,status,effective_status,objective,daily_budget,insights." + tr + "{" + INSIGHT_SUBFIELDS_ACCOUNTING + "}";
    }

    private String buildAdSetOrAdInsightFields(boolean includeBudget) {
        String insightBlock = "insights{" + INSIGHT_SUBFIELDS_ADSET_AD + "}";
        String base = "id,name,status,effective_status," + insightBlock;
        if (includeBudget) {
            return "daily_budget," + base;
        }
        return base;
    }

    private String buildAdSetFieldsEmbeddedTimeRange(LocalDate start, LocalDate end, boolean includeBudget) {
        String tr = embeddedInsightTimeRange(start, end);
        String insightBlock = "insights." + tr + "{" + INSIGHT_SUBFIELDS_ADSET_AD + "}";
        String base = "id,name,status,effective_status," + insightBlock;
        if (includeBudget) {
            return "daily_budget," + base;
        }
        return base;
    }

    private List<PaidTrafficAssetRowDTO> fetchAllPages(String firstPageUrl, PaidTrafficAssetRowDTO.AssetLevel level) {
        List<PaidTrafficAssetRowDTO> out = new ArrayList<>();
        String url = firstPageUrl;
        int guard = 0;
        while (url != null && guard++ < 50) {
            try {
                ResponseEntity<String> res = restTemplate.getForEntity(URI.create(url), String.class);
                String body = res.getBody();
                if (body == null) break;
                JsonNode root = objectMapper.readTree(body);
                if (root.has("error")) {
                    log.warn("[MetaPaidTrafficGraph] API error: {}", root.get("error"));
                    break;
                }
                JsonNode data = root.get("data");
                if (data != null && data.isArray()) {
                    for (JsonNode node : data) {
                        out.add(mapNode(node, level));
                    }
                }
                JsonNode paging = root.get("paging");
                if (paging != null && paging.has("next") && !paging.get("next").isNull()) {
                    url = paging.get("next").asText();
                } else {
                    url = null;
                }
            } catch (HttpClientErrorException e) {
                log.warn("[MetaPaidTrafficGraph] HTTP {} — {}", e.getStatusCode(),
                        e.getResponseBodyAsString() != null ? e.getResponseBodyAsString() : e.getMessage());
                break;
            } catch (Exception e) {
                log.warn("[MetaPaidTrafficGraph] fetch failed: {}", e.getMessage());
                break;
            }
        }
        return out;
    }

    private String mapObjectiveLabel(String obj) {
        if (obj == null || obj.isBlank()) return null;
        return switch (obj.toUpperCase(Locale.ROOT)) {
            case "OUTCOME_LEADS", "LEAD_GENERATION" -> "LEADS";
            case "OUTCOME_SALES", "CONVERSIONS" -> "VENDAS";
            case "OUTCOME_TRAFFIC", "LINK_CLICKS" -> "TRÁFEGO";
            case "OUTCOME_ENGAGEMENT", "POST_ENGAGEMENT" -> "ENGAJAMENTO";
            case "OUTCOME_AWARENESS", "BRAND_AWARENESS" -> "ALCANCE";
            default -> "OUTROS";
        };
    }

    private static double sumPurchaseActionValues(JsonNode actionValues) {
        if (actionValues == null || !actionValues.isArray()) return 0;
        double sum = 0;
        for (JsonNode a : actionValues) {
            String at = a.path("action_type").asText("");
            if (at.contains("purchase") || "omni_purchase".equals(at)
                    || at.startsWith("offsite_conversion.fb_pixel")
                    || at.startsWith("web_in_store_purchase")) {
                sum += a.path("value").asDouble(0);
            }
        }
        return sum;
    }

    /** Soma todos os valores monetários reportados (fallback quando não há só compra). */
    private static double sumAllActionValues(JsonNode actionValues) {
        if (actionValues == null || !actionValues.isArray()) return 0;
        double sum = 0;
        for (JsonNode a : actionValues) {
            sum += a.path("value").asDouble(0);
        }
        return sum;
    }

    private ParsedInsight parseInsightPayload(JsonNode i) {
        if (i == null || i.isNull()) {
            return ParsedInsight.empty();
        }
        double spend = i.has("spend") ? i.get("spend").asDouble() : 0;
        long impressions = i.has("impressions") ? i.get("impressions").asLong() : 0;
        long clicks = i.has("clicks") ? i.get("clicks").asLong() : 0;
        double ctr = i.has("ctr") ? parseCtr(i.get("ctr").asText()) : 0;
        long conversions = 0;
        double purchaseValue = 0;
        if (i.has("actions")) {
            for (JsonNode a : i.get("actions")) {
                String at = a.path("action_type").asText("");
                if (at.contains("messaging_conversation") || "lead".equals(at) || at.contains("purchase")) {
                    conversions += a.path("value").asLong(0);
                }
            }
        }
        if (i.has("action_values")) {
            JsonNode av = i.get("action_values");
            purchaseValue += sumPurchaseActionValues(av);
            if (purchaseValue <= 0) {
                purchaseValue = sumAllActionValues(av);
            }
        }
        return new ParsedInsight(spend, impressions, clicks, ctr, conversions, purchaseValue);
    }

    /**
     * Totais da conta ({@code act_…/insights}) no intervalo — mesmo critério de período da tabela de campanhas.
     */
    public Optional<AccountInsightTotals> fetchAccountTotals(User user, LocalDate start, LocalDate end) {
        Optional<MetaConnection> conn = connection(user);
        if (conn.isEmpty()) {
            return Optional.empty();
        }
        String aid = normalizeAdAccountId(conn.get().getAdAccountId());
        String token = conn.get().getAccessToken();
        String url = buildGraphUrl(aid + "/insights", INSIGHT_SUBFIELDS_ACCOUNTING, token, start, end);
        try {
            ResponseEntity<String> res = restTemplate.getForEntity(URI.create(url), String.class);
            String body = res.getBody();
            if (body == null) {
                return Optional.empty();
            }
            JsonNode root = objectMapper.readTree(body);
            if (root.has("error")) {
                log.warn("[MetaPaidTrafficGraph] account /insights error: {}", root.get("error"));
                return Optional.empty();
            }
            JsonNode data = root.get("data");
            if (data == null || !data.isArray() || data.isEmpty()) {
                return Optional.of(AccountInsightTotals.empty());
            }
            double spend = 0;
            long impressions = 0;
            long clicks = 0;
            long conversions = 0;
            for (JsonNode row : data) {
                ParsedInsight p = parseInsightPayload(row);
                spend += p.spend();
                impressions += p.impressions();
                clicks += p.clicks();
                conversions += p.conversions();
            }
            return Optional.of(AccountInsightTotals.builder()
                    .spend(spend)
                    .impressions(impressions)
                    .clicks(clicks)
                    .conversions(conversions)
                    .build());
        } catch (Exception e) {
            log.warn("[MetaPaidTrafficGraph] account /insights failed: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private PaidTrafficAssetRowDTO mapNode(JsonNode node, PaidTrafficAssetRowDTO.AssetLevel level) {
        String id = node.has("id") ? node.get("id").asText() : "";
        String name = node.has("name") ? node.get("name").asText() : "";
        String status = node.has("effective_status") ? node.get("effective_status").asText()
                : (node.has("status") ? node.get("status").asText() : "");
        String objectiveLabel = level == PaidTrafficAssetRowDTO.AssetLevel.CAMPAIGN && node.has("objective")
                ? mapObjectiveLabel(node.get("objective").asText())
                : null;
        Double dailyBudget = null;
        if (node.has("daily_budget") && !node.get("daily_budget").isNull()) {
            dailyBudget = node.get("daily_budget").asDouble() / 100.0;
        }

        ParsedInsight ins = ParsedInsight.empty();
        if (node.has("insights") && node.get("insights").has("data")) {
            JsonNode arr = node.get("insights").get("data");
            if (arr.isArray() && arr.size() > 0) {
                ins = parseInsightPayload(arr.get(0));
            }
        }
        double spend = ins.spend();
        long impressions = ins.impressions();
        long clicks = ins.clicks();
        double ctr = ins.ctr();
        long conversions = ins.conversions();
        double purchaseValue = ins.purchaseValue();

        Double cpl = conversions > 0 ? spend / conversions : null;
        Double roas = (spend > 0 && purchaseValue > 0) ? purchaseValue / spend : null;
        if (roas == null && spend > 0 && conversions > 0) {
            roas = MetaTrafficKpiFormulas.kpiStyleRoas(conversions, spend);
            log.debug("[MetaPaidTrafficGraph] ROAS por KPI (conv×100/gasto) id={} roas={} conv={} spend={}",
                    id, roas, conversions, spend);
        }

        return PaidTrafficAssetRowDTO.builder()
                .id(id)
                .level(level)
                .name(name)
                .status(status)
                .objective(objectiveLabel)
                .dailyBudget(dailyBudget)
                .spend(spend)
                .impressions(impressions)
                .clicks(clicks)
                .ctr(ctr)
                .conversions(conversions)
                .cpl(cpl)
                .roas(roas)
                .trend(null)
                .build();
    }

    private double parseCtr(String raw) {
        try {
            return Double.parseDouble(raw.replace("%", "").trim());
        } catch (Exception e) {
            return 0;
        }
    }
}
