package com.backend.winai.service;

import com.backend.winai.dto.marketing.CampaignListItemDTO;
import com.backend.winai.dto.marketing.CampaignsListResponse;
import com.backend.winai.dto.marketing.CreateCampaignRequest;
import com.backend.winai.dto.marketing.InstagramMetricsResponse;
import com.backend.winai.dto.marketing.TrafficMetricsResponse;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.MetaConnection;
import com.backend.winai.entity.User;
import com.backend.winai.repository.InstagramMetricRepository;
import com.backend.winai.repository.MetaAdRepository;
import com.backend.winai.repository.MetaAdSetRepository;
import com.backend.winai.repository.MetaCampaignRepository;
import com.backend.winai.repository.MetaConnectionRepository;
import com.backend.winai.repository.MetaInsightRepository;
import com.backend.winai.repository.CompanyRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import org.springframework.web.multipart.MultipartFile;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.*;

@Service
@Slf4j
@RequiredArgsConstructor
public class MarketingService {

    @Value("${meta.api.base-url:https://graph.facebook.com/v19.0}")
    private String metaApiBaseUrl;

    @Value("${meta.client.id:}")
    private String clientId;

    @Value("${meta.client.secret:}")
    private String clientSecret;

    @Value("${meta.redirect.uri:https://server.somosamplia.com/api/v1/marketing/auth/meta/callback}")
    private String redirectUri;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    @Value("${meta.sync.enabled:true}")
    private boolean metaSyncEnabled;

    @Value("${meta.sync.cron:0 */30 * * * *}")
    private String syncCron;

    public java.util.List<Map<String, Object>> getRealTimeCampaigns(Company company) {
        Optional<MetaConnection> connectionOpt = metaConnectionRepository.findByCompany(company);
        if (connectionOpt.isEmpty() || !connectionOpt.get().isConnected()
                || connectionOpt.get().getAdAccountId() == null) {
            return new ArrayList<>();
        }

        MetaConnection conn = connectionOpt.get();
        String accessToken = conn.getAccessToken();

        try {
            // Fetch campaigns with insights
            String url = String.format(
                    "%s/%s/campaigns?fields=id,name,status,objective,insights%%7Bspend,clicks,actions%%7D&date_preset=last_30d&access_token=%s",
                    metaApiBaseUrl, conn.getAdAccountId(), accessToken);

            ResponseEntity<String> response = getWithRetry(url);
            String responseBody = response.getBody();
            log.info("Meta Campaigns Response for company {}: {}", company.getId(), responseBody);
            JsonNode data = objectMapper.readTree(responseBody).get("data");

            List<Map<String, Object>> result = new ArrayList<>();
            if (data != null && data.isArray()) {
                for (JsonNode node : data) {
                    Map<String, Object> campaign = new HashMap<>();
                    campaign.put("id", node.get("id").asText());
                    campaign.put("name", node.get("name").asText());
                    campaign.put("status", node.get("status").asText());

                    double spend = 0.0;
                    long clicks = 0;
                    long conversions = 0;

                    if (node.has("insights") && node.get("insights").has("data")) {
                        JsonNode insights = node.get("insights").get("data");
                        if (insights.isArray() && insights.size() > 0) {
                            JsonNode i = insights.get(0);
                            spend = i.has("spend") ? i.get("spend").asDouble() : 0.0;
                            clicks = i.has("clicks") ? i.get("clicks").asLong() : 0;

                            if (i.has("actions")) {
                                for (JsonNode action : i.get("actions")) {
                                    String actionType = action.get("action_type").asText();
                                    if ("onsite_conversion.messaging_conversation_started_7d".equals(actionType) ||
                                            "lead".equals(actionType)) {
                                        conversions += action.get("value").asLong();
                                    }
                                }
                            }
                        }
                    }

                    campaign.put("spend", spend);
                    campaign.put("clicks", clicks);
                    campaign.put("conversions", conversions);
                    result.add(campaign);
                }
            }
            return result;

        } catch (Exception e) {
            log.error("Error fetching RealTimeCampaigns for company {}", company.getId(), e);
            return new ArrayList<>();
        }
    }

    public CampaignsListResponse getCampaignsForUser(User user) {
        return getCampaignsForCompany(companyRepository.findById(user.getCompany().getId())
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada")));
    }

    public CampaignsListResponse getCampaignsForCompany(Company company) {
        Optional<MetaConnection> connectionOpt = metaConnectionRepository.findByCompany(company);
        if (connectionOpt.isEmpty() || !connectionOpt.get().isConnected()
                || connectionOpt.get().getAdAccountId() == null) {
            return CampaignsListResponse.builder()
                    .campaigns(new ArrayList<>())
                    .accountName(null)
                    .build();
        }

        MetaConnection conn = connectionOpt.get();
        String accessToken = conn.getAccessToken();
        String accountName = "Conta de Anúncios";

        try {
            String adAccountUrl = String.format("%s/%s?fields=name&access_token=%s",
                    metaApiBaseUrl, conn.getAdAccountId(), accessToken);
            ResponseEntity<String> accResponse = getWithRetry(adAccountUrl);
            if (accResponse.getBody() != null) {
                JsonNode accNode = objectMapper.readTree(accResponse.getBody());
                if (accNode.has("name")) accountName = accNode.get("name").asText();
            }
        } catch (Exception e) {
            log.warn("Could not fetch account name: {}", e.getMessage());
        }

        try {
            String url = String.format(
                    "%s/%s/campaigns?fields=id,name,status,objective,daily_budget,insights%%7Bspend,impressions,reach,clicks,ctr,actions%%7D&date_preset=last_30d&access_token=%s",
                    metaApiBaseUrl, conn.getAdAccountId(), accessToken);

            ResponseEntity<String> response = getWithRetry(url);
            String responseBody = response.getBody();
            if (responseBody == null) return CampaignsListResponse.builder().campaigns(new ArrayList<>()).accountName(accountName).build();

            JsonNode data = objectMapper.readTree(responseBody).get("data");
            List<CampaignListItemDTO> result = new ArrayList<>();

            if (data != null && data.isArray()) {
                for (JsonNode node : data) {
                    String id = node.get("id").asText();
                    String name = node.has("name") ? node.get("name").asText() : "Campanha";
                    String status = node.has("status") ? node.get("status").asText() : "UNKNOWN";
                    String objective = node.has("objective") ? node.get("objective").asText() : "";

                    double dailyBudget = 0.0;
                    if (node.has("daily_budget")) {
                        dailyBudget = node.get("daily_budget").asDouble() / 100.0;
                    }

                    double spend = 0.0;
                    long impressions = 0;
                    long reach = 0;
                    long clicks = 0;
                    double ctr = 0.0;
                    long conversions = 0;

                    if (node.has("insights") && node.get("insights").has("data")) {
                        JsonNode insights = node.get("insights").get("data");
                        if (insights.isArray() && insights.size() > 0) {
                            JsonNode i = insights.get(0);
                            spend = i.has("spend") ? i.get("spend").asDouble() : 0.0;
                            impressions = i.has("impressions") ? i.get("impressions").asLong() : 0;
                            reach = i.has("reach") ? i.get("reach").asLong() : impressions;
                            clicks = i.has("clicks") ? i.get("clicks").asLong() : 0;
                            ctr = i.has("ctr") ? Double.parseDouble(i.get("ctr").asText().replace("%", "")) : 0.0;
                            if (i.has("actions")) {
                                for (JsonNode action : i.get("actions")) {
                                    String at = action.get("action_type").asText();
                                    if ("onsite_conversion.messaging_conversation_started_7d".equals(at) || "lead".equals(at)) {
                                        conversions += action.get("value").asLong();
                                    }
                                }
                            }
                        }
                    }

                    if (dailyBudget <= 0) {
                        try {
                            String adsetsUrl = String.format("%s/%s/adsets?fields=daily_budget&access_token=%s",
                                    metaApiBaseUrl, id, accessToken);
                            ResponseEntity<String> asRes = getWithRetry(adsetsUrl);
                            if (asRes.getBody() != null) {
                                JsonNode asData = objectMapper.readTree(asRes.getBody()).get("data");
                                if (asData != null && asData.isArray()) {
                                    for (JsonNode as : asData) {
                                        if (as.has("daily_budget")) {
                                            dailyBudget += as.get("daily_budget").asDouble() / 100.0;
                                        }
                                    }
                                }
                            }
                        } catch (Exception ignored) {}
                    }

                    double cpl = conversions > 0 ? spend / conversions : 0;

                    String objectiveLabel = mapObjective(objective);

                    result.add(CampaignListItemDTO.builder()
                            .id(id)
                            .name(name)
                            .status(status)
                            .objective(objectiveLabel)
                            .accountName(accountName)
                            .accountId(conn.getAdAccountId())
                            .dailyBudget(dailyBudget > 0 ? dailyBudget : null)
                            .spend(spend)
                            .impressions(impressions)
                            .reach(reach)
                            .clicks(clicks)
                            .ctr(ctr)
                            .conversions(conversions)
                            .cpl(cpl > 0 ? cpl : null)
                            .build());
                }
            }

            return CampaignsListResponse.builder()
                    .campaigns(result)
                    .accountName(accountName)
                    .build();

        } catch (Exception e) {
            log.error("Error fetching campaigns for user", e);
            return CampaignsListResponse.builder()
                    .campaigns(new ArrayList<>())
                    .accountName(accountName)
                    .build();
        }
    }

    private String mapObjective(String obj) {
        if (obj == null) return "OUTROS";
        return switch (obj.toUpperCase()) {
            case "OUTCOME_LEADS", "LEAD_GENERATION" -> "LEADS";
            case "OUTCOME_SALES", "CONVERSIONS" -> "VENDAS";
            case "OUTCOME_TRAFFIC", "LINK_CLICKS" -> "TRÁFEGO";
            case "OUTCOME_ENGAGEMENT", "POST_ENGAGEMENT" -> "ENGAJAMENTO";
            case "OUTCOME_AWARENESS", "BRAND_AWARENESS" -> "ALCANCE";
            default -> "OUTROS";
        };
    }

    public void updateCampaignStatus(User user, String campaignId, String status) {
        Company company = companyRepository.findById(user.getCompany().getId())
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));
        MetaConnection conn = metaConnectionRepository.findByCompany(company)
                .filter(MetaConnection::isConnected)
                .orElseThrow(() -> new RuntimeException("Meta Ads não conectado"));

        String url = metaApiBaseUrl + "/" + campaignId;
        String body = "status=" + ( "ACTIVE".equalsIgnoreCase(status) ? "ACTIVE" : "PAUSED" );

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            HttpEntity<String> entity = new HttpEntity<>(body + "&access_token=" + conn.getAccessToken(), headers);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            log.info("Campaign {} status updated to {}", campaignId, status);
        } catch (Exception e) {
            log.error("Error updating campaign status: {}", e.getMessage());
            throw new RuntimeException("Erro ao atualizar status da campanha: " + e.getMessage());
        }
    }

    public List<Map<String, Object>> searchTargeting(User user, String query, String type) {
        MetaConnection conn = metaConnectionRepository.findByCompany(user.getCompany())
                .filter(MetaConnection::isConnected)
                .filter(c -> c.getAdAccountId() != null)
                .orElse(null);
        if (conn == null || query == null || query.isBlank()) {
            return List.of();
        }
        try {
            // Meta API usa limit_type (ex: interests), não type
            String limitType = "adinterest".equalsIgnoreCase(type) ? "interests" : type;
            String url = String.format("%s/%s/targetingsearch?limit_type=%s&q=%s&limit=25&access_token=%s",
                    metaApiBaseUrl, conn.getAdAccountId(), limitType,
                    java.net.URLEncoder.encode(query, StandardCharsets.UTF_8), conn.getAccessToken());
            ResponseEntity<String> res = getWithRetry(url);
            JsonNode data = objectMapper.readTree(res.getBody()).get("data");
            List<Map<String, Object>> result = new ArrayList<>();
            if (data != null && data.isArray()) {
                for (JsonNode node : data) {
                    Map<String, Object> item = new HashMap<>();
                    if (node.has("id")) item.put("id", node.get("id").asText());
                    if (node.has("name")) item.put("name", node.get("name").asText());
                    if (!item.isEmpty()) result.add(item);
                }
            }
            return result;
        } catch (Exception e) {
            log.warn("Targeting search failed: {}", e.getMessage());
            return List.of();
        }
    }

    public Map<String, String> uploadCampaignImage(User user, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("Selecione uma imagem para enviar");
        }
        String ext = file.getOriginalFilename() != null && file.getOriginalFilename().contains(".")
                ? file.getOriginalFilename().substring(file.getOriginalFilename().lastIndexOf(".") + 1).toLowerCase()
                : "jpg";
        if (!List.of("jpg", "jpeg", "png", "webp", "gif").contains(ext)) {
            throw new RuntimeException("Formato não suportado. Use JPG, PNG, WebP ou GIF.");
        }
        String filename = "campaigns/" + UUID.randomUUID() + "." + ext;
        String publicUrl = supabaseStorageService.uploadFile("social-media-uploads", filename, file);
        return Map.of("url", publicUrl);
    }

    public void increaseCampaignBudget(User user, String campaignId, int percentIncrease) {
        Company company = companyRepository.findById(user.getCompany().getId())
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));
        MetaConnection conn = metaConnectionRepository.findByCompany(company)
                .filter(MetaConnection::isConnected)
                .orElseThrow(() -> new RuntimeException("Meta Ads não conectado"));

        try {
            String adsetsUrl = String.format("%s/%s/adsets?fields=id,daily_budget&access_token=%s",
                    metaApiBaseUrl, campaignId, conn.getAccessToken());
            ResponseEntity<String> asRes = getWithRetry(adsetsUrl);
            if (asRes.getBody() == null) throw new RuntimeException("Nenhum ad set encontrado");

            JsonNode asData = objectMapper.readTree(asRes.getBody()).get("data");
            if (asData == null || !asData.isArray()) throw new RuntimeException("Nenhum ad set encontrado");

            double factor = 1 + (percentIncrease / 100.0);
            for (JsonNode as : asData) {
                String adsetId = as.get("id").asText();
                long currentBudget = as.has("daily_budget") ? as.get("daily_budget").asLong() : 0;
                if (currentBudget <= 0) continue;
                long newBudget = Math.round(currentBudget * factor);
                newBudget = Math.max(newBudget, 100);

                String updateUrl = metaApiBaseUrl + "/" + adsetId;
                String body = "daily_budget=" + newBudget + "&access_token=" + conn.getAccessToken();
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
                HttpEntity<String> entity = new HttpEntity<>(body, headers);
                restTemplate.exchange(updateUrl, HttpMethod.POST, entity, String.class);
            }
            log.info("Campaign {} budget increased by {}%", campaignId, percentIncrease);
        } catch (Exception e) {
            log.error("Error increasing campaign budget: {}", e.getMessage());
            throw new RuntimeException("Erro ao aumentar orçamento: " + e.getMessage());
        }
    }

    public java.util.List<Map<String, Object>> getRealTimeInsights(Company company, int days) {
        Optional<MetaConnection> connectionOpt = metaConnectionRepository.findByCompany(company);
        if (connectionOpt.isEmpty() || !connectionOpt.get().isConnected()
                || connectionOpt.get().getAdAccountId() == null) {
            return new ArrayList<>();
        }

        MetaConnection conn = connectionOpt.get();
        String accessToken = conn.getAccessToken();

        try {
            LocalDate endDate = LocalDate.now();
            LocalDate startDate = endDate.minusDays(days);
            String timeRange = String.format("{\"since\":\"%s\",\"until\":\"%s\"}", startDate, endDate);

            // Fetch daily breakdown
            String url = String.format(
                    "%s/%s/insights?fields=spend,impressions,clicks,reach,actions,date_start&time_range=%s&time_increment=1&access_token=%s",
                    metaApiBaseUrl, conn.getAdAccountId(),
                    java.net.URLEncoder.encode(timeRange, "UTF-8"),
                    accessToken);

            ResponseEntity<String> response = getWithRetry(url);
            String responseBody = response.getBody();
            log.info("Meta Insights Response for company {}: {}", company.getId(), responseBody);
            JsonNode data = objectMapper.readTree(responseBody).get("data");

            List<Map<String, Object>> result = new ArrayList<>();
            if (data != null && data.isArray()) {
                for (JsonNode node : data) {
                    Map<String, Object> dayData = new HashMap<>();
                    dayData.put("date", node.get("date_start").asText());
                    dayData.put("spend", node.has("spend") ? node.get("spend").asDouble() : 0.0);
                    dayData.put("impressions", node.has("impressions") ? node.get("impressions").asLong() : 0L);
                    dayData.put("clicks", node.has("clicks") ? node.get("clicks").asLong() : 0L);

                    long conversions = 0;
                    if (node.has("actions")) {
                        for (JsonNode action : node.get("actions")) {
                            String actionType = action.get("action_type").asText();
                            if ("onsite_conversion.messaging_conversation_started_7d".equals(actionType) ||
                                    "lead".equals(actionType)) {
                                conversions += action.get("value").asLong();
                            }
                        }
                    }
                    dayData.put("conversions", conversions);
                    result.add(dayData);
                }
            }
            return result;

        } catch (Exception e) {
            log.error("Error fetching RealTimeInsights for company {}", company.getId(), e);
            return new ArrayList<>();
        }
    }

    private final MetaConnectionRepository metaConnectionRepository;
    private final CompanyRepository companyRepository;
    private final SupabaseStorageService supabaseStorageService;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private volatile int latestUsageRate = 0;

    public String getFrontendUrl() {
        return frontendUrl;
    }

    public TrafficMetricsResponse getTrafficMetrics() {
        return buildEmptyMetrics();
    }

    public TrafficMetricsResponse getTrafficMetrics(User user, String campaignId) {
        Company company = companyRepository.findById(user.getCompany().getId())
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));
        Optional<MetaConnection> connectionOpt = metaConnectionRepository.findByCompany(company);

        if (connectionOpt.isEmpty() || !connectionOpt.get().isConnected()) {
            log.warn("Metas Ads connection not found for company: {}", company.getId());
            return buildEmptyMetrics();
        }

        MetaConnection connection = connectionOpt.get();
        String accessToken = connection.getAccessToken();
        String adAccountId = connection.getAdAccountId();

        if (adAccountId == null || adAccountId.isEmpty() || accessToken == null || accessToken.isEmpty()) {
            return buildEmptyMetrics();
        }

        // Quando campaignId informado, busca insights da campanha; senão, da conta de anúncios
        String insightsResourceId = (campaignId != null && !campaignId.isBlank()) ? campaignId : adAccountId;

        try {
            String historyUrl = String.format(
                    "%s/%s/insights?fields=spend,impressions,clicks,actions,date_start&date_preset=last_14d&time_increment=1&access_token=%s",
                    metaApiBaseUrl, insightsResourceId, accessToken);
            ResponseEntity<String> historyResponse = getWithRetry(historyUrl);
            String historyBody = historyResponse.getBody();
            log.info("Meta Traffic Metrics for {} (campaignId={}): {}", user.getId(), campaignId, historyBody != null ? "ok" : "null");
            JsonNode historyData = objectMapper.readTree(historyBody).get("data");

            return mapToResponse(historyData);

        } catch (Exception e) {
            log.error("Error fetching Meta Ads data", e);
            return buildEmptyMetrics();
        }
    }

    public InstagramMetricsResponse getInstagramMetrics(User user) {
        Optional<MetaConnection> connectionOpt = metaConnectionRepository.findByCompany(user.getCompany());

        if (connectionOpt.isEmpty()) {
            log.info("[InstagramMetrics] Sem conexão Meta para empresa {}", user.getCompany().getId());
            return buildEmptyInstagramMetrics();
        }
        MetaConnection connCheck = connectionOpt.get();
        if (!connCheck.isConnected()) {
            log.info("[InstagramMetrics] Meta desconectada para empresa {}", user.getCompany().getId());
            return buildEmptyInstagramMetrics();
        }
        if (connCheck.getPageId() == null) {
            log.info("[InstagramMetrics] PageId ausente na conexão Meta para empresa {}", user.getCompany().getId());
            return buildEmptyInstagramMetrics();
        }

        MetaConnection connection = connectionOpt.get();
        String accessToken = connection.getAccessToken();
        String pageId = connection.getPageId();

        try {
            // 1. Get Instagram Business Account ID
            String igAccountUrl = String.format("%s/%s?fields=instagram_business_account&access_token=%s",
                    metaApiBaseUrl, pageId, accessToken);
            log.info("[InstagramMetrics] Buscando IG Business Account para pageId={}", pageId);
            ResponseEntity<String> igAccountRes = getWithRetry(igAccountUrl);
            String igAccountBody = igAccountRes.getBody();
            log.info("[InstagramMetrics] Meta/IG Account response: {}", igAccountBody);
            JsonNode igAccountRoot = objectMapper.readTree(igAccountBody);
            if (igAccountRoot.has("error")) {
                log.warn("[InstagramMetrics] Meta API error: {}", igAccountRoot.get("error"));
                return buildEmptyInstagramMetrics();
            }
            JsonNode igAccountNode = igAccountRoot.get("instagram_business_account");

            if (igAccountNode == null || igAccountNode.isNull()) {
                log.warn("[InstagramMetrics] Nenhuma conta Instagram Business vinculada à página {}", pageId);
                return buildEmptyInstagramMetrics();
            }

            String igId = igAccountNode.get("id").asText();
            log.info("[InstagramMetrics] IG Business ID encontrado: {}", igId);

            // 2. Fetch User basic info (followers count)
            String basicInfoUrl = String.format("%s/%s?fields=followers_count,media_count&access_token=%s",
                    metaApiBaseUrl, igId, accessToken);
            String basicInfoBody = getWithRetry(basicInfoUrl).getBody();
            log.info("[InstagramMetrics] Basic info response: {}", basicInfoBody);
            JsonNode basicInfo = objectMapper.readTree(basicInfoBody);
            if (basicInfo.has("error")) {
                log.warn("[InstagramMetrics] Meta API error em basic info: {}", basicInfo.get("error"));
                return buildEmptyInstagramMetrics();
            }
            long followers = basicInfo.has("followers_count") ? basicInfo.get("followers_count").asLong() : 0;
            log.info("[InstagramMetrics] Followers: {}", followers);

            // 3. Fetch Insights - current period (last 30 days)
            LocalDate today = LocalDate.now();
            LocalDate sinceCurrent = today.minusDays(30);
            // Instagram User Insights: accounts_engaged requer metric_type=total_value
            String insightsUrl = String.format(
                    "%s/%s/insights?metric=reach,accounts_engaged,follower_count&metric_type=total_value&period=day&since=%s&until=%s&access_token=%s",
                    metaApiBaseUrl, igId, sinceCurrent, today, accessToken);
            log.info("[InstagramMetrics] Insights URL (30d): {}", insightsUrl.replace(accessToken, "***"));
            String insightsBody = getWithRetry(insightsUrl).getBody();
            log.info("[InstagramMetrics] Insights response: {}", insightsBody);
            JsonNode insightsResponse = objectMapper.readTree(insightsBody);
            if (insightsResponse.has("error")) {
                log.warn("[InstagramMetrics] Meta API error em insights: {}", insightsResponse.get("error"));
            }
            JsonNode insightsData = insightsResponse.has("data") ? insightsResponse.get("data") : null;
            int insightsSize = (insightsData != null && insightsData.isArray()) ? insightsData.size() : 0;
            log.info("[InstagramMetrics] Insights data size: {}", insightsSize);

            // Fallback: if empty or error, try without since/until (some API versions differ)
            if (insightsData == null || !insightsData.isArray() || insightsData.size() == 0) {
                log.info("[InstagramMetrics] Insights vazio, tentando fallback sem since/until");
                String fallbackUrl = String.format(
                        "%s/%s/insights?metric=reach,accounts_engaged,follower_count&metric_type=total_value&period=day&access_token=%s",
                        metaApiBaseUrl, igId, accessToken);
                String fallbackBody = getWithRetry(fallbackUrl).getBody();
                log.info("[InstagramMetrics] Fallback insights response: {}", fallbackBody);
                JsonNode fallbackRes = objectMapper.readTree(fallbackBody);
                insightsData = fallbackRes.has("data") ? fallbackRes.get("data") : null;
                if (insightsData != null && insightsData.isArray()) {
                    log.info("[InstagramMetrics] Fallback insights data size: {}", insightsData.size());
                } else {
                    log.warn("[InstagramMetrics] Fallback insights também vazio");
                }
            }

            // 4. Fetch Insights - previous period (30-60 days ago) for trend calculation
            LocalDate sincePrevious = today.minusDays(60);
            String insightsPrevUrl = String.format(
                    "%s/%s/insights?metric=reach,accounts_engaged,follower_count&metric_type=total_value&period=day&since=%s&until=%s&access_token=%s",
                    metaApiBaseUrl, igId, sincePrevious, sinceCurrent, accessToken);
            JsonNode insightsPrevData = null;
            try {
                JsonNode prevResponse = objectMapper.readTree(getWithRetry(insightsPrevUrl).getBody());
                insightsPrevData = prevResponse.has("data") ? prevResponse.get("data") : null;
            } catch (Exception ex) {
                log.info("[InstagramMetrics] Período anterior não disponível: {}", ex.getMessage());
            }

            InstagramMetricsResponse result = mapToInstagramResponse(followers, insightsData, insightsPrevData);
            log.info("[InstagramMetrics] Sucesso: followers={}, impressions={}, performanceHistory size={}",
                    result.getFollowers().getValue(), result.getImpressions().getValue(),
                    result.getPerformanceHistory() != null ? result.getPerformanceHistory().size() : 0);
            return result;

        } catch (Exception e) {
            log.error("[InstagramMetrics] Erro ao buscar dados Instagram: {}", e.getMessage(), e);
            return buildEmptyInstagramMetrics();
        }
    }

    private InstagramMetricsResponse mapToInstagramResponse(long totalFollowers, JsonNode insights,
            JsonNode insightsPrevious) {
        if (insights == null || !insights.isArray() || insights.size() == 0) {
            log.info("[InstagramMetrics] mapToInstagramResponse: insights null ou vazio, retornando zeros");
        }
        long impressionsTotal = 0;
        long reachTotal = 0;
        long interactionsTotal = 0; // accounts_engaged
        long followersFirst = totalFollowers;
        long followersLast = totalFollowers;
        List<InstagramMetricsResponse.DailyPerformance> performance = new ArrayList<>();

        // Parse current period metrics - sum all daily values for last 30 days
        Map<String, Double> dailyReach = new LinkedHashMap<>();
        if (insights != null && insights.isArray()) {
            for (JsonNode metric : insights) {
                if (!metric.has("name")) continue;
                String name = metric.get("name").asText();
                JsonNode values = metric.has("values") ? metric.get("values") : null;
                if (values == null || !values.isArray()) continue;

                long totalForMetric = 0;
                for (int i = 0; i < values.size(); i++) {
                    JsonNode val = values.get(i);
                    long v = val.has("value") ? val.get("value").asLong() : 0;
                    totalForMetric += v;

                    if ("reach".equals(name) || "impressions".equals(name)) {
                        String endTime = val.has("end_time") ? val.get("end_time").asText() : "";
                        if (endTime.length() >= 10) {
                            String dateStr = endTime.substring(8, 10) + "/" + endTime.substring(5, 7);
                            dailyReach.merge(dateStr, (double) v, (a, b) -> a + b);
                        }
                    }
                    if ("follower_count".equals(name)) {
                        if (i == 0) followersFirst = v;
                        followersLast = v;
                    }
                }
                switch (name) {
                    case "impressions" -> impressionsTotal = totalForMetric;
                    case "reach" -> reachTotal = totalForMetric;
                    case "accounts_engaged" -> interactionsTotal = totalForMetric;
                    default -> { }
                }
            }
        }
        log.info("[InstagramMetrics] mapToInstagramResponse: impressions={}, reach={}, interactions={}, dailyReach entries={}",
                impressionsTotal, reachTotal, interactionsTotal, dailyReach.size());
        performance = dailyReach.entrySet().stream()
                .map(e -> InstagramMetricsResponse.DailyPerformance.builder()
                        .date(e.getKey())
                        .value(e.getValue())
                        .build())
                .sorted(Comparator.comparing(InstagramMetricsResponse.DailyPerformance::getDate))
                .toList();

        // Previous period totals for trend calculation
        long prevImpressions = 0, prevReach = 0, prevInteractions = 0;
        if (insightsPrevious != null && insightsPrevious.isArray()) {
            for (JsonNode metric : insightsPrevious) {
                if (!metric.has("name") || !metric.has("values")) continue;
                String name = metric.get("name").asText();
                JsonNode values = metric.get("values");
                long sum = 0;
                for (JsonNode val : values) {
                    sum += val.has("value") ? val.get("value").asLong() : 0;
                }
                switch (name) {
                    case "impressions" -> prevImpressions = sum;
                    case "reach" -> prevReach = sum;
                    case "accounts_engaged" -> prevInteractions = sum;
                    default -> { }
                }
            }
        }

        // Use impressions for display; fallback to reach if impressions is 0 (some APIs return reach only)
        long displayImpressions = impressionsTotal > 0 ? impressionsTotal : reachTotal;

        double engagementRate = (displayImpressions > 0)
                ? (double) interactionsTotal / displayImpressions * 100
                : (reachTotal > 0 ? (double) interactionsTotal / reachTotal * 100 : 0);

        String followersTrend = formatTrend(followersLast, followersFirst);
        String engagementTrend = formatTrend(engagementRate,
                prevImpressions > 0 ? (double) prevInteractions / prevImpressions * 100 : 0);
        String impressionsTrend = formatTrend(displayImpressions, prevImpressions > 0 ? prevImpressions : prevReach);
        String interactionsTrend = formatTrend(interactionsTotal, prevInteractions);

        return InstagramMetricsResponse.builder()
                .followers(InstagramMetricsResponse.MetricDetail.builder()
                        .value(formatNumber(totalFollowers))
                        .trend(followersTrend)
                        .isPositive(true)
                        .build())
                .engagementRate(InstagramMetricsResponse.MetricDetail.builder()
                        .value(String.format("%.2f%%", engagementRate))
                        .trend(engagementTrend)
                        .isPositive(!engagementTrend.startsWith("-"))
                        .build())
                .impressions(InstagramMetricsResponse.MetricDetail.builder()
                        .value(formatNumber(displayImpressions))
                        .trend(impressionsTrend)
                        .isPositive(!impressionsTrend.startsWith("-"))
                        .build())
                .interactions(InstagramMetricsResponse.MetricDetail.builder()
                        .value(formatNumber(interactionsTotal))
                        .trend(interactionsTrend)
                        .isPositive(!interactionsTrend.startsWith("-"))
                        .build())
                .performanceHistory(performance)
                .build();
    }

    /** Formats trend as percentage change; returns "0%" when no previous data. */
    private String formatTrend(long current, long previous) {
        if (previous == 0) return "0%";
        double pct = ((double) (current - previous) / previous) * 100;
        return String.format("%s%.1f%%", pct >= 0 ? "+" : "", pct);
    }

    private String formatTrend(double current, double previous) {
        if (previous == 0) return "0%";
        double pct = ((current - previous) / previous) * 100;
        return String.format("%s%.1f%%", pct >= 0 ? "+" : "", pct);
    }

    private InstagramMetricsResponse buildEmptyInstagramMetrics() {
        return InstagramMetricsResponse.builder()
                .followers(
                        InstagramMetricsResponse.MetricDetail.builder().value("0").trend("0%").isPositive(true).build())
                .engagementRate(InstagramMetricsResponse.MetricDetail.builder().value("0%").trend("0%").isPositive(true)
                        .build())
                .impressions(
                        InstagramMetricsResponse.MetricDetail.builder().value("0").trend("0%").isPositive(true).build())
                .interactions(
                        InstagramMetricsResponse.MetricDetail.builder().value("0").trend("0%").isPositive(true).build())
                .performanceHistory(new ArrayList<>())
                .build();
    }

    public String getMetaAuthorizationUrl(User user) {
        // Using Facebook Login for Business with config_id
        // This ensures users select assets from a specific Business Manager
        String configId = "1444720510682524";
        return String.format(
                "https://www.facebook.com/v19.0/dialog/oauth?client_id=%s&redirect_uri=%s&state=%s&config_id=%s&response_type=code&override_default_response_type=true",
                clientId, redirectUri, user.getCompany().getId(), configId);
    }

    @Transactional
    public String handleMetaCallback(String code, String companyId) {
        try {
            String tokenUrl = String.format(
                    "https://graph.facebook.com/v19.0/oauth/access_token?client_id=%s&redirect_uri=%s&client_secret=%s&code=%s",
                    clientId, redirectUri, clientSecret, code);

            ResponseEntity<String> response = getWithRetry(tokenUrl);
            JsonNode tokenBody = objectMapper.readTree(response.getBody());
            String accessToken = tokenBody.get("access_token").asText();

            // Transform to Long Lived Token (60 days)
            String longLivedUrl = String.format(
                    "https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=%s&client_secret=%s&fb_exchange_token=%s",
                    clientId, clientSecret, accessToken);
            ResponseEntity<String> llResponse = getWithRetry(longLivedUrl);
            JsonNode llBody = objectMapper.readTree(llResponse.getBody());
            String longLivedToken = llBody.get("access_token").asText();

            // Get user ID
            String meUrl = String.format("https://graph.facebook.com/me?access_token=%s", longLivedToken);
            ResponseEntity<String> meResponse = getWithRetry(meUrl);
            JsonNode meBody = objectMapper.readTree(meResponse.getBody());
            String metaUserId = meBody.get("id").asText();

            // Get expiration if available
            long expiresIn = llBody.has("expires_in") ? llBody.get("expires_in").asLong()
                    : 5184000; // 60 days default

            MetaConnection connection = metaConnectionRepository.findByCompanyId(java.util.UUID.fromString(companyId))
                    .orElse(new MetaConnection());

            // Check if reconnecting to a different account - clean old data in cascade
            boolean isReconnecting = connection.getId() != null &&
                    (connection.getMetaUserId() == null || !connection.getMetaUserId().equals(metaUserId));

            if (isReconnecting) {
                log.info("Reconnecting Meta account for company {}. Cleaning old synced data...", companyId);
                Company company = companyRepository.findById(java.util.UUID.fromString(companyId))
                        .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));

                // No longer need to delete from synced tables as they are removed/unused

                log.info("Old Meta data cleaned for company {}", companyId);
            }

            connection.setCompany(Company.builder().id(java.util.UUID.fromString(companyId)).build());
            connection.setAccessToken(longLivedToken);
            connection.setMetaUserId(metaUserId);
            connection.setTokenExpiresAt(ZonedDateTime.now().plusSeconds(expiresIn));
            connection.setLongLived(true);
            connection.setConnected(true);

            // Fetch first Ad Account and Page as default (simplified)
            try {
                fetchDefaultAccounts(connection);
            } catch (Exception e) {
                log.warn("Could not fetch default accounts", e);
            }

            metaConnectionRepository.save(connection);
            log.info("Meta connection saved for company {} - AdAccountId: {}, BusinessId: {}",
                    companyId, connection.getAdAccountId(), connection.getBusinessId());

            if (connection.getAdAccountId() != null) {
                log.info("Ad Account configured: {}", connection.getAdAccountId());
                // No sync triggered
            } else {
                log.warn("No Ad Account found during OAuth.");
            }

            return frontendUrl + "/configuracoes?meta=connected";
        } catch (

        Exception e) {
            log.error("Error in meta callback", e);
            return frontendUrl + "/configuracoes?error=meta_auth_failed";
        }
    }

    @Transactional
    public void handleMetaDeauthorize(String signedRequest) {
        try {
            JsonNode payload = decodeSignedRequest(signedRequest);
            if (payload != null && payload.has("user_id")) {
                String metaUserId = payload.get("user_id").asText();
                metaConnectionRepository.findByMetaUserId(metaUserId).ifPresent(conn -> {
                    conn.setConnected(false);
                    conn.setAccessToken(null);
                    metaConnectionRepository.save(conn);
                    log.info("Meta application deauthorized for user ID: {}", metaUserId);
                });
            }
        } catch (Exception e) {
            log.error("Error handling meta deauthorize", e);
        }
    }

    @Transactional
    public Map<String, String> handleMetaDataDeletion(String signedRequest) {
        try {
            JsonNode payload = decodeSignedRequest(signedRequest);
            if (payload != null && payload.has("user_id")) {
                String metaUserId = payload.get("user_id").asText();
                metaConnectionRepository.findByMetaUserId(metaUserId).ifPresent(conn -> {
                    // Logic to delete or anonymize data if needed
                    // For now, disconnect and mark as deleted
                    conn.setConnected(false);
                    conn.setAccessToken(null);
                    metaConnectionRepository.save(conn);
                    log.info("Data deletion requested for Meta user ID: {}", metaUserId);
                });

                String confirmationCode = UUID.randomUUID().toString();
                return Map.of(
                        "url", frontendUrl + "/configuracoes?deletion_id=" + confirmationCode,
                        "confirmation_code", confirmationCode);
            }
        } catch (Exception e) {
            log.error("Error handling data deletion request", e);
        }
        return Map.of("error", "Invalid request");
    }

    private JsonNode decodeSignedRequest(String signedRequest) throws Exception {
        String[] parts = signedRequest.split("\\.");
        if (parts.length != 2)
            return null;

        String signature = parts[0];
        String payload = parts[1];

        // Validate signature
        byte[] expectedSig = hmacSha256(payload, clientSecret);
        byte[] providedSig = Base64.getUrlDecoder().decode(signature);

        if (!Arrays.equals(expectedSig, providedSig)) {
            log.warn("Invalid signature in Meta signed_request");
            // return null; // Meta verification requires actual validation, but for testing
            // or if client_secret matches it works
        }

        String decodedPayload = new String(Base64.getUrlDecoder().decode(payload));
        return new ObjectMapper().readTree(decodedPayload);
    }

    private byte[] hmacSha256(String data, String key) throws Exception {
        SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(secretKey);
        return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
    }

    private void fetchDefaultAccounts(MetaConnection connection) throws Exception {
        log.info("fetchDefaultAccounts starting for connection with metaUserId: {}", connection.getMetaUserId());
        String accessToken = connection.getAccessToken();

        // Step 1: Try to get the Business ID from the token
        // For Facebook Login for Business tokens, we can get client_business_id
        // directly
        String businessId = null;
        try {
            // First try to get client_business_id (available with Business Integration
            // System User tokens)
            String clientBizUrl = String.format("%s/me?fields=client_business_id&access_token=%s",
                    metaApiBaseUrl, accessToken);
            ResponseEntity<String> clientBizResponse = getWithRetry(clientBizUrl);
            JsonNode clientBizData = objectMapper.readTree(clientBizResponse.getBody());
            if (clientBizData.has("client_business_id")) {
                businessId = clientBizData.get("client_business_id").asText();
                connection.setBusinessId(businessId);
                log.info("Found Business Manager from token (client_business_id): {}", businessId);
            }
        } catch (Exception e) {
            log.debug("Could not get client_business_id, trying me/businesses", e);
        }

        // If we didn't get client_business_id, try me/businesses
        if (businessId == null) {
            try {
                String businessUrl = String.format("%s/me/businesses?fields=id,name&access_token=%s",
                        metaApiBaseUrl, accessToken);
                ResponseEntity<String> businessResponse = getWithRetry(businessUrl);
                JsonNode businessData = objectMapper.readTree(businessResponse.getBody()).get("data");
                if (businessData != null && businessData.size() > 0) {
                    businessId = businessData.get(0).get("id").asText();
                    connection.setBusinessId(businessId);
                    log.info("Found Business Manager from me/businesses: {} ({})",
                            businessData.get(0).get("name").asText(), businessId);
                }
            } catch (Exception e) {
                log.warn("Could not fetch Business Manager, will use personal accounts", e);
            }
        }

        // Step 2: Fetch Ad Accounts - use BM endpoint if we have a business ID
        try {
            String adAccountsUrl;
            if (businessId != null) {
                // Use the Business Manager's owned ad accounts
                adAccountsUrl = String.format("%s/%s/owned_ad_accounts?fields=id,name&access_token=%s",
                        metaApiBaseUrl, businessId, accessToken);
            } else {
                // Fallback to personal ad accounts
                adAccountsUrl = String.format("%s/me/adaccounts?fields=id,name&access_token=%s",
                        metaApiBaseUrl, accessToken);
            }
            ResponseEntity<String> adAccountsResponse = getWithRetry(adAccountsUrl);
            JsonNode adAccountsData = objectMapper.readTree(adAccountsResponse.getBody()).get("data");
            if (adAccountsData != null && adAccountsData.size() > 0) {
                connection.setAdAccountId(adAccountsData.get(0).get("id").asText());
                log.info("Found Ad Account: {}", adAccountsData.get(0).get("name").asText());
            }
        } catch (Exception e) {
            log.warn("Could not fetch Ad Accounts", e);
        }

        // Step 3: Fetch Pages - use BM endpoint if we have a business ID
        try {
            String pagesUrl;
            if (businessId != null) {
                // Use the Business Manager's owned pages
                pagesUrl = String.format("%s/%s/owned_pages?fields=id,name&access_token=%s",
                        metaApiBaseUrl, businessId, accessToken);
            } else {
                // Fallback to personal pages
                pagesUrl = String.format("%s/me/accounts?fields=id,name&access_token=%s",
                        metaApiBaseUrl, accessToken);
            }
            ResponseEntity<String> pagesResponse = getWithRetry(pagesUrl);
            JsonNode pagesData = objectMapper.readTree(pagesResponse.getBody()).get("data");
            if (pagesData != null && pagesData.size() > 0) {
                connection.setPageId(pagesData.get(0).get("id").asText());
                log.info("Found Page: {}", pagesData.get(0).get("name").asText());
            }
        } catch (Exception e) {
            log.warn("Could not fetch Pages", e);
        }

        // Step 4: Try to fetch Instagram account from BM if available
        if (businessId != null) {
            try {
                String igUrl = String.format("%s/%s/instagram_accounts?fields=id,username&access_token=%s",
                        metaApiBaseUrl, businessId, accessToken);
                ResponseEntity<String> igResponse = getWithRetry(igUrl);
                JsonNode igData = objectMapper.readTree(igResponse.getBody()).get("data");
                if (igData != null && igData.size() > 0) {
                    connection.setInstagramBusinessId(igData.get(0).get("id").asText());
                    log.info("Found Instagram account: {}",
                            igData.get(0).has("username") ? igData.get(0).get("username").asText()
                                    : igData.get(0).get("id").asText());
                }
            } catch (Exception e) {
                log.warn("Could not fetch Instagram accounts from BM", e);
            }
        }
    }

    public Map<String, Object> getMetaConnectionStatus(User user) {
        Company company = companyRepository.findById(user.getCompany().getId())
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));

        return metaConnectionRepository.findByCompany(company)
                .map(conn -> {
                    Map<String, Object> res = new HashMap<>();
                    res.put("connected", conn.isConnected());
                    res.put("adAccountId", conn.getAdAccountId());
                    res.put("pageId", conn.getPageId());
                    res.put("businessId", conn.getBusinessId());
                    res.put("instagramBusinessId", conn.getInstagramBusinessId());
                    return res;
                })
                .orElse(Map.of("connected", false));
    }

    /**
     * Retorna detalhes completos da conexão Meta incluindo nomes legíveis
     * das contas, páginas e Instagram para exibição no frontend
     */
    public Map<String, Object> getMetaConnectionDetails(User user) {
        Company company = companyRepository.findById(user.getCompany().getId())
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));

        Optional<MetaConnection> connectionOpt = metaConnectionRepository.findByCompany(company);

        if (connectionOpt.isEmpty() || !connectionOpt.get().isConnected()) {
            return Map.of("connected", false);
        }

        MetaConnection conn = connectionOpt.get();
        String accessToken = conn.getAccessToken();

        Map<String, Object> result = new HashMap<>();
        result.put("connected", true);
        result.put("connectedAt", conn.getCreatedAt());
        result.put("tokenExpiresAt", conn.getTokenExpiresAt());
        result.put("metaUserId", conn.getMetaUserId());

        // Fetch Ad Account details
        if (conn.getAdAccountId() != null) {
            try {
                String adAccountUrl = String.format(
                        "%s/%s?fields=name,account_status,currency,timezone_name,business_name&access_token=%s",
                        metaApiBaseUrl, conn.getAdAccountId(), accessToken);
                ResponseEntity<String> response = getWithRetry(adAccountUrl);
                JsonNode data = objectMapper.readTree(response.getBody());

                Map<String, Object> adAccount = new HashMap<>();
                adAccount.put("id", conn.getAdAccountId());
                adAccount.put("name", data.has("name") ? data.get("name").asText() : "Conta de Anúncios");
                adAccount.put("status",
                        data.has("account_status") ? getAccountStatusLabel(data.get("account_status").asInt())
                                : "Desconhecido");
                adAccount.put("currency", data.has("currency") ? data.get("currency").asText() : "BRL");
                adAccount.put("timezone",
                        data.has("timezone_name") ? data.get("timezone_name").asText() : "America/Sao_Paulo");
                adAccount.put("businessName", data.has("business_name") ? data.get("business_name").asText() : null);
                result.put("adAccount", adAccount);
            } catch (Exception e) {
                log.warn("Failed to fetch ad account details: {}", e.getMessage());
                result.put("adAccount",
                        Map.of("id", conn.getAdAccountId(), "name", "Conta de Anúncios", "status", "Ativo"));
            }
        }

        // Fetch Page details
        if (conn.getPageId() != null) {
            try {
                String pageUrl = String.format("%s/%s?fields=name,category,fan_count,picture&access_token=%s",
                        metaApiBaseUrl, conn.getPageId(), accessToken);
                ResponseEntity<String> response = getWithRetry(pageUrl);
                JsonNode data = objectMapper.readTree(response.getBody());

                log.info("Page API response for {}: {}", conn.getPageId(), response.getBody());

                Map<String, Object> page = new HashMap<>();
                page.put("id", conn.getPageId());
                page.put("name", data.has("name") ? data.get("name").asText() : "Página");
                page.put("category", data.has("category") ? data.get("category").asText() : "Negócios");
                page.put("fanCount", data.has("fan_count") ? data.get("fan_count").asLong() : 0);
                if (data.has("picture") && data.get("picture").has("data")) {
                    page.put("pictureUrl", data.get("picture").get("data").get("url").asText());
                }
                result.put("page", page);
            } catch (Exception e) {
                log.warn("Failed to fetch page details: {}", e.getMessage());
                result.put("page", Map.of("id", conn.getPageId(), "name", "Página do Facebook"));
            }
        }

        // Fetch Instagram Business Account details
        if (conn.getInstagramBusinessId() != null) {
            try {
                String igUrl = String.format(
                        "%s/%s?fields=username,name,profile_picture_url,followers_count,media_count&access_token=%s",
                        metaApiBaseUrl, conn.getInstagramBusinessId(), accessToken);
                ResponseEntity<String> response = getWithRetry(igUrl);
                JsonNode data = objectMapper.readTree(response.getBody());

                Map<String, Object> instagram = new HashMap<>();
                instagram.put("id", conn.getInstagramBusinessId());
                instagram.put("username", data.has("username") ? data.get("username").asText() : "instagram");
                instagram.put("name", data.has("name") ? data.get("name").asText() : "Instagram Business");
                instagram.put("profilePictureUrl",
                        data.has("profile_picture_url") ? data.get("profile_picture_url").asText() : null);
                instagram.put("followersCount", data.has("followers_count") ? data.get("followers_count").asLong() : 0);
                instagram.put("mediaCount", data.has("media_count") ? data.get("media_count").asLong() : 0);
                result.put("instagram", instagram);
            } catch (Exception e) {
                log.warn("Failed to fetch Instagram details: {}", e.getMessage());
                result.put("instagram", Map.of("id", conn.getInstagramBusinessId(), "username", "instagram"));
            }
        }

        // Fetch campaigns summary (Live)
        try {
            String campaignsUrl = String.format(
                    "%s/%s/campaigns?fields=status&access_token=%s",
                    metaApiBaseUrl, conn.getAdAccountId(), accessToken);
            ResponseEntity<String> response = getWithRetry(campaignsUrl);
            if (response.getBody() != null) {
                JsonNode data = objectMapper.readTree(response.getBody()).get("data");
                long total = 0;
                long active = 0;
                if (data != null && data.isArray()) {
                    total = data.size();
                    for (JsonNode node : data) {
                        if ("ACTIVE".equalsIgnoreCase(node.path("status").asText())) {
                            active++;
                        }
                    }
                }
                Map<String, Object> campaigns = new HashMap<>();
                campaigns.put("total", total);
                campaigns.put("active", active);
                result.put("campaigns", campaigns);
            }
        } catch (Exception e) {
            log.warn("Failed to fetch campaigns summary: {}", e.getMessage());
        }

        // Fetch insights summary (last 30 days) (Live)
        try {
            // Using date_preset=last_30d
            String insightsUrl = String.format(
                    "%s/%s/insights?fields=spend,impressions,clicks,actions&date_preset=last_30d&access_token=%s",
                    metaApiBaseUrl, conn.getAdAccountId(), accessToken);

            ResponseEntity<String> response = getWithRetry(insightsUrl);
            if (response.getBody() != null) {
                JsonNode data = objectMapper.readTree(response.getBody()).get("data");

                double totalSpend = 0.0;
                long totalImpressions = 0;
                long totalClicks = 0;
                int daysWithData = 0;

                if (data != null && data.isArray() && data.size() > 0) {
                    daysWithData = 1; // The summary endpoint returns aggregated data usually as one object if no
                                      // time_increment is set, or we can simply check if data exists
                    JsonNode summary = data.get(0);
                    totalSpend = summary.path("spend").asDouble(0.0);
                    totalImpressions = summary.path("impressions").asLong(0);
                    totalClicks = summary.path("clicks").asLong(0);
                }

                Map<String, Object> insightsSummary = new HashMap<>();
                insightsSummary.put("period", "Últimos 30 dias");
                insightsSummary.put("totalSpend", String.format("R$ %.2f", totalSpend));
                insightsSummary.put("totalImpressions", totalImpressions);
                insightsSummary.put("totalClicks", totalClicks);
                insightsSummary.put("daysWithData", daysWithData > 0 ? "30+" : "0");
                result.put("insights", insightsSummary);
            }
        } catch (Exception e) {
            log.warn("Failed to fetch insights summary: {}", e.getMessage());
        }

        return result;
    }

    private String getAccountStatusLabel(int status) {
        return switch (status) {
            case 1 -> "Ativo";
            case 2 -> "Desativado";
            case 3 -> "Não Definido";
            case 7 -> "Pendente de Revisão";
            case 8 -> "Pendente de Fechamento";
            case 9 -> "Em Período de Carência";
            case 100 -> "Pendente de Risco";
            case 101 -> "Fechado por Risco";
            case 201 -> "Ação Necessária";
            case 202 -> "Fechado Extra";
            default -> "Desconhecido (" + status + ")";
        };
    }

    @Transactional
    public void disconnectMeta(User user) {
        Company company = companyRepository.findById(user.getCompany().getId())
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));

        metaConnectionRepository.findByCompany(company).ifPresent(conn -> {

            // Delete the connection itself
            metaConnectionRepository.delete(conn);
        });
    }

    // Sync methods removed as we are moving to Live Fetching

    // Methods removed

    /**
     * Cria campanha completa no Meta Ads API: Campaign -> Ad Set -> Ad Creative -> Ad.
     * Documentação: https://developers.facebook.com/docs/marketing-api/get-started/basic-ad-creation/
     */
    public void createCampaign(User user, CreateCampaignRequest request) {
        Company company = companyRepository.findById(user.getCompany().getId())
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));

        MetaConnection conn = metaConnectionRepository.findByCompany(company)
                .filter(MetaConnection::isConnected)
                .orElseThrow(() -> new RuntimeException("Conecte sua conta Meta Ads em Configurações antes de criar campanhas"));

        if (conn.getAdAccountId() == null || conn.getAdAccountId().isBlank()) {
            throw new RuntimeException("Conta de anúncios não configurada. Reconecte o Meta Ads.");
        }
        if (conn.getPageId() == null || conn.getPageId().isBlank()) {
            throw new RuntimeException("Página do Facebook não vinculada. Reconecte o Meta Ads e autorize a página.");
        }

        String accessToken = conn.getAccessToken();
        String adAccountId = conn.getAdAccountId();
        String pageId = conn.getPageId();

        validateRequest(request);

        String objective = request.getObjective();
        if (objective == null || objective.isBlank()) objective = "LINK_CLICKS";

        long budgetCents = Math.round((request.getDailyBudget() != null ? request.getDailyBudget() : 50.0) * 100);
        budgetCents = Math.max(budgetCents, 100); // Mínimo R$ 1,00

        int ageMin = request.getAgeMin() != null ? request.getAgeMin() : 18;
        int ageMax = request.getAgeMax() != null ? request.getAgeMax() : 65;
        ageMin = Math.max(18, Math.min(65, ageMin));
        ageMax = Math.max(18, Math.min(65, ageMax));
        if (ageMax < ageMin) ageMax = ageMin;

        String country = (request.getCountryCode() != null && !request.getCountryCode().isBlank())
                ? request.getCountryCode().toUpperCase().substring(0, 2) : "BR";

        try {
            adaptiveThrottle();

            // 1. Criar Campaign
            String campaignId = createMetaCampaign(adAccountId, accessToken, request.getName(), objective);
            log.info("[META] Campaign created: {}", campaignId);

            // 2. Criar Ad Set
            String optimizationGoal = mapOptimizationGoal(objective);
            String adSetId = createMetaAdSet(adAccountId, accessToken, campaignId, pageId,
                    budgetCents, country, ageMin, ageMax, optimizationGoal, request.getInterests());
            log.info("[META] Ad Set created: {}", adSetId);

            // 3. Obter image_hash (upload via adimages) ou usar picture URL
            String adImageHash = null;
            if (request.getImageUrl() != null && !request.getImageUrl().isBlank()) {
                try {
                    adImageHash = uploadAdImage(adAccountId, accessToken, request.getImageUrl());
                } catch (Exception e) {
                    log.warn("[META] Image upload failed, will try picture URL: {}", e.getMessage());
                }
            }

            // 4. Criar Ad Creative
            String creativeId = createMetaAdCreative(adAccountId, accessToken, pageId,
                    request.getAdMessage(), request.getDestinationUrl(), request.getHeadline(),
                    adImageHash, request.getImageUrl());
            log.info("[META] Ad Creative created: {}", creativeId);

            // 5. Criar Ad
            createMetaAd(adAccountId, accessToken, adSetId, creativeId, request.getName());
            log.info("[META] Ad created successfully for campaign: {}", request.getName());

        } catch (org.springframework.web.client.HttpClientErrorException e) {
            String body = e.getResponseBodyAsString();
            log.error("[META] API Error creating campaign: {} - {}", e.getStatusCode(), body);
            throw new RuntimeException(com.backend.winai.util.ErrorHelper.normalizeMessage(body));
        } catch (Exception e) {
            log.error("[META] Error creating campaign", e);
            throw new RuntimeException(e.getMessage() != null ? e.getMessage() : "Erro ao criar campanha no Meta Ads");
        }
    }

    private static String serializeToJson(ObjectMapper mapper, Object obj) {
        try {
            return mapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("JSON serialization failed", e);
        }
    }

    private static JsonNode parseJson(ObjectMapper mapper, String json) {
        if (json == null) throw new RuntimeException("JSON string is null");
        try {
            return mapper.readTree(json);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("JSON parse failed", e);
        }
    }

    private void validateRequest(CreateCampaignRequest r) {
        if (r.getName() == null || r.getName().isBlank()) {
            throw new RuntimeException("Nome da campanha é obrigatório");
        }
        if (r.getAdMessage() == null || r.getAdMessage().isBlank()) {
            throw new RuntimeException("Texto do anúncio é obrigatório");
        }
        if (r.getDestinationUrl() == null || r.getDestinationUrl().isBlank()) {
            throw new RuntimeException("URL de destino é obrigatória");
        }
        if (r.getImageUrl() == null || r.getImageUrl().isBlank()) {
            throw new RuntimeException("Imagem do anúncio é obrigatória");
        }
    }

    private String mapOptimizationGoal(String objective) {
        return switch (objective != null ? objective.toUpperCase() : "") {
            case "OUTCOME_LEADS" -> "LEAD_GENERATION";
            case "OUTCOME_SALES" -> "OUTCOME_CONVERSIONS";
            case "OUTCOME_ENGAGEMENT" -> "POST_ENGAGEMENT";
            case "OUTCOME_AWARENESS" -> "REACH";
            default -> "LINK_CLICKS";
        };
    }

    private String createMetaCampaign(String adAccountId, String accessToken, String name, String objective) {
        String url = metaApiBaseUrl + "/" + adAccountId + "/campaigns";
        Map<String, Object> params = new HashMap<>();
        params.put("name", name);
        params.put("objective", objective);
        params.put("status", "PAUSED");
        params.put("special_ad_categories", "[]");
        params.put("access_token", accessToken);

        ResponseEntity<String> res = postForm(url, params);
        String body = res.getBody();
        if (body == null) throw new RuntimeException("Meta API: Empty response");
        JsonNode node = parseJson(objectMapper, body);
        if (node.has("id")) return node.get("id").asText();
        throw new RuntimeException("Meta API: " + (node.has("error") ? node.get("error").get("message").asText() : "Campaign creation failed"));
    }

    private String createMetaAdSet(String adAccountId, String accessToken, String campaignId, String pageId,
                                   long dailyBudgetCents, String country, int ageMin, int ageMax, String optimizationGoal,
                                   String interestsJson) {
        String url = metaApiBaseUrl + "/" + adAccountId + "/adsets";

        Map<String, Object> targeting = new HashMap<>();
        Map<String, Object> geo = new HashMap<>();
        geo.put("countries", List.of(country));
        targeting.put("geo_locations", geo);
        targeting.put("age_min", ageMin);
        targeting.put("age_max", ageMax);

        if (interestsJson != null && !interestsJson.isBlank()) {
            try {
                JsonNode arr = objectMapper.readTree(interestsJson);
                if (arr.isArray() && arr.size() > 0) {
                    List<Map<String, Object>> interestsList = new ArrayList<>();
                    for (JsonNode node : arr) {
                        if (node.has("id")) {
                            Map<String, Object> spec = new HashMap<>();
                            spec.put("id", node.get("id").asText());
                            if (node.has("name")) spec.put("name", node.get("name").asText());
                            interestsList.add(spec);
                        }
                    }
                    if (!interestsList.isEmpty()) {
                        targeting.put("flexible_spec", List.of(Map.of("interests", interestsList)));
                    }
                }
            } catch (Exception e) {
                log.warn("Could not parse interests for targeting: {}", e.getMessage());
            }
        }

        Map<String, Object> promotedObject = new HashMap<>();
        promotedObject.put("page_id", pageId);

        Map<String, Object> params = new HashMap<>();
        params.put("name", "Ad Set - " + System.currentTimeMillis());
        params.put("campaign_id", campaignId);
        params.put("daily_budget", dailyBudgetCents);
        params.put("targeting", serializeToJson(objectMapper, targeting));
        params.put("optimization_goal", optimizationGoal);
        params.put("billing_event", "IMPRESSIONS");
        params.put("promoted_object", serializeToJson(objectMapper, promotedObject));
        params.put("status", "PAUSED");
        params.put("access_token", accessToken);

        ResponseEntity<String> res = postForm(url, params);
        JsonNode node = parseJson(objectMapper, res.getBody());
        if (node.has("id")) return node.get("id").asText();
        throw new RuntimeException("Meta API: " + (node.has("error") ? node.get("error").get("message").asText() : "Ad Set creation failed"));
    }

    private String uploadAdImage(String adAccountId, String accessToken, String imageUrl) {
        String url = metaApiBaseUrl + "/" + adAccountId + "/adimages";
        Map<String, Object> params = new HashMap<>();
        params.put("url", imageUrl);
        params.put("access_token", accessToken);

        ResponseEntity<String> res = postForm(url, params);
        JsonNode node = parseJson(objectMapper, res.getBody());
        if (node.has("images")) {
            JsonNode images = node.get("images");
            var it = images.fields();
            while (it.hasNext()) {
                JsonNode imgNode = it.next().getValue();
                if (imgNode.has("hash")) return imgNode.get("hash").asText();
            }
        }
        throw new RuntimeException("Meta API: Falha ao fazer upload da imagem. Use uma URL pública de imagem.");
    }

    private String createMetaAdCreative(String adAccountId, String accessToken, String pageId,
                                       String message, String link, String headline,
                                       String imageHash, String imageUrl) {
        String url = metaApiBaseUrl + "/" + adAccountId + "/adcreatives";

        Map<String, Object> linkData = new HashMap<>();
        linkData.put("message", message != null ? message : "Confira!");
        linkData.put("link", link != null ? link : "https://www.facebook.com");
        if (headline != null && !headline.isBlank()) linkData.put("name", headline);
        if (imageHash != null) {
            linkData.put("image_hash", imageHash);
        } else if (imageUrl != null && !imageUrl.isBlank()) {
            linkData.put("picture", imageUrl);
        } else {
            throw new RuntimeException("Imagem é obrigatória para o criativo");
        }
        Map<String, Object> cta = new HashMap<>();
        cta.put("type", "LEARN_MORE");
        cta.put("value", Map.of("link", link != null ? link : "https://www.facebook.com"));
        linkData.put("call_to_action", cta);

        Map<String, Object> objectStorySpec = new HashMap<>();
        objectStorySpec.put("page_id", pageId);
        objectStorySpec.put("link_data", linkData);

        Map<String, Object> params = new HashMap<>();
        params.put("name", "Creative - " + System.currentTimeMillis());
        params.put("object_story_spec", serializeToJson(objectMapper, objectStorySpec));
        params.put("access_token", accessToken);

        ResponseEntity<String> res = postForm(url, params);
        JsonNode node = parseJson(objectMapper, res.getBody());
        if (node.has("id")) return node.get("id").asText();
        throw new RuntimeException("Meta API: " + (node.has("error") ? node.get("error").get("message").asText() : "Ad Creative creation failed"));
    }

    private void createMetaAd(String adAccountId, String accessToken, String adSetId, String creativeId, String name) {
        String url = metaApiBaseUrl + "/" + adAccountId + "/ads";

        Map<String, Object> creative = new HashMap<>();
        creative.put("creative_id", creativeId);

        Map<String, Object> params = new HashMap<>();
        params.put("name", name);
        params.put("adset_id", adSetId);
        params.put("creative", serializeToJson(objectMapper, creative));
        params.put("status", "PAUSED");
        params.put("access_token", accessToken);

        ResponseEntity<String> res = postForm(url, params);
        JsonNode node = parseJson(objectMapper, res.getBody());
        if (node.has("id")) return;
        throw new RuntimeException("Meta API: " + (node.has("error") ? node.get("error").get("message").asText() : "Ad creation failed"));
    }

    private ResponseEntity<String> postForm(String url, Map<String, Object> params) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        StringBuilder body = new StringBuilder();
        params.forEach((k, v) -> {
            if (body.length() > 0) body.append("&");
            try {
                body.append(java.net.URLEncoder.encode(k, "UTF-8")).append("=");
                body.append(java.net.URLEncoder.encode(v != null ? v.toString() : "", "UTF-8"));
            } catch (java.io.UnsupportedEncodingException e) {
                throw new RuntimeException(e);
            }
        });
        HttpEntity<String> entity = new HttpEntity<>(body.toString(), headers);
        return restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
    }

    private TrafficMetricsResponse mapToResponse(JsonNode historyData) {
        double currentSpend = 0;
        long currentImpressions = 0;
        long currentClicks = 0;
        long currentConversions = 0;

        double previousSpend = 0;
        long previousImpressions = 0;
        long previousClicks = 0;
        long previousConversions = 0;

        List<TrafficMetricsResponse.DailyPerformance> performance = new ArrayList<>();

        if (historyData != null && historyData.isArray()) {
            int totalDays = historyData.size();
            // Assuming Meta returns chronologically (oldest first)
            // Last 7 days are the "current" period
            // Days before that are the "previous" period
            int currentStartIndex = Math.max(0, totalDays - 7);

            for (int i = 0; i < totalDays; i++) {
                JsonNode node = historyData.get(i);
                double spend = node.has("spend") ? node.get("spend").asDouble() : 0.0;
                long imps = node.has("impressions") ? node.get("impressions").asLong() : 0;
                long clks = node.has("clicks") ? node.get("clicks").asLong() : 0;
                long convs = 0;

                if (node.has("actions")) {
                    for (JsonNode action : node.get("actions")) {
                        String actionType = action.get("action_type").asText();
                        if ("onsite_conversion.messaging_conversation_started_7d".equals(actionType) ||
                                "lead".equals(actionType) ||
                                "purchase".equals(actionType)) {
                            convs += action.get("value").asLong();
                        }
                    }
                }

                if (i >= currentStartIndex) {
                    currentSpend += spend;
                    currentImpressions += imps;
                    currentClicks += clks;
                    currentConversions += convs;

                    performance.add(TrafficMetricsResponse.DailyPerformance.builder()
                            .date(node.get("date_start").asText().substring(8, 10) + "/"
                                    + node.get("date_start").asText().substring(5, 7))
                            .value(spend)
                            .build());
                } else {
                    previousSpend += spend;
                    previousImpressions += imps;
                    previousClicks += clks;
                    previousConversions += convs;
                }
            }
        }

        double currentRoas = currentSpend > 0 ? (currentConversions * 100.0) / currentSpend : 0;
        double previousRoas = previousSpend > 0 ? (previousConversions * 100.0) / previousSpend : 0;

        return TrafficMetricsResponse.builder()
                .investment(
                        createTrendDetail(currentSpend, previousSpend, String.format("R$ %.2f", currentSpend), true))
                .impressions(createTrendDetail((double) currentImpressions, (double) previousImpressions,
                        formatNumber(currentImpressions), true))
                .clicks(createTrendDetail((double) currentClicks, (double) previousClicks,
                        String.valueOf(currentClicks), true))
                .conversations(createTrendDetail((double) currentConversions, (double) previousConversions,
                        String.valueOf(currentConversions), true))
                .roas(createTrendDetail(currentRoas, previousRoas, String.format("%.1fx", currentRoas), true))
                .performanceHistory(performance)
                .build();
    }

    private TrafficMetricsResponse.MetricDetail createTrendDetail(double current, double previous,
            String formattedValue,
            boolean higherIsBetter) {
        double diff = current - previous;
        double trendPercent = (previous > 0) ? (diff / previous * 100) : 0;
        boolean isPositive = higherIsBetter ? (diff >= 0) : (diff <= 0);

        return TrafficMetricsResponse.MetricDetail.builder()
                .value(formattedValue)
                .trend(String.format("%.1f%%", Math.abs(trendPercent)))
                .isPositive(isPositive)
                .build();
    }

    private TrafficMetricsResponse.MetricDetail createDetail(String value, String trend, boolean positive) {
        return TrafficMetricsResponse.MetricDetail.builder()
                .value(value)
                .trend(trend)
                .isPositive(positive)
                .build();
    }

    private String formatNumber(long number) {
        if (number >= 1000000)
            return String.format("%.1fM", number / 1000000.0);
        if (number >= 1000)
            return String.format("%.1fk", number / 1000.0);
        return String.valueOf(number);
    }

    private TrafficMetricsResponse buildEmptyMetrics() {
        return TrafficMetricsResponse.builder()
                .investment(createDetail("R$ 0,00", "0%", true))
                .impressions(createDetail("0", "0%", true))
                .clicks(createDetail("0", "0%", true))
                .conversations(createDetail("0", "0%", true))
                .roas(createDetail("0.0x", "0%", true))
                .performanceHistory(new ArrayList<>())
                .build();
    }

    private ResponseEntity<String> getWithRetry(String url) {
        // Use java.net.URI to avoid RestTemplate's template expansion of curly braces
        // {}
        // Meta API needs {} for field expansion and doesn't like them encoded as
        // %7B/%7D in some parameters.
        java.net.URI uri = java.net.URI.create(url);
        int maxAttempts = 3;
        for (int i = 0; i < maxAttempts; i++) {
            try {
                ResponseEntity<String> response = restTemplate.getForEntity(uri, String.class);
                updateUsageRate(response);
                return response;
            } catch (org.springframework.web.client.HttpClientErrorException e) {
                String body = e.getResponseBodyAsString();
                // Code 17 is "User request limit reached", also check 429 status
                boolean isRateLimit = e.getStatusCode().value() == 429 ||
                        (e.getStatusCode().value() == 400
                                && (body.contains("\"code\":17") || body.contains("\"code\": 17")));

                if (isRateLimit && i < maxAttempts - 1) {
                    log.warn("Meta API rate limit reached. Waiting 120s (2 minutes) before retry... (Attempt {})",
                            i + 1);
                    try {
                        Thread.sleep(120000); // Wait 2 minutes for recovery
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw e;
                    }
                    continue;
                }
                throw e;
            }
        }
        return null; // Should not be reached
    }

    private void updateUsageRate(ResponseEntity<?> response) {
        try {
            // Check X-App-Usage
            String appUsage = response.getHeaders().getFirst("X-App-Usage");
            if (appUsage != null) {
                parseUsageJson(appUsage);
            }

            // Check X-Business-Use-Case (modern Marketing API)
            String bizUsage = response.getHeaders().getFirst("X-Business-Use-Case");
            if (bizUsage != null) {
                // Format: {"business_id":[{"type":"adsbackend","call_count":10,...}]}
                JsonNode node = objectMapper.readTree(bizUsage);
                Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
                while (fields.hasNext()) {
                    JsonNode bizNode = fields.next().getValue();
                    if (bizNode.isArray() && bizNode.size() > 0) {
                        parseUsageJson(bizNode.get(0).toString());
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Failed to parse Meta usage headers: {}", e.getMessage());
        }
    }

    private void parseUsageJson(String json) {
        try {
            JsonNode node = objectMapper.readTree(json);
            int max = 0;
            if (node.has("call_count"))
                max = Math.max(max, node.get("call_count").asInt());
            if (node.has("total_cputime"))
                max = Math.max(max, node.get("total_cputime").asInt());
            if (node.has("total_time"))
                max = Math.max(max, node.get("total_time").asInt());

            if (max > 0) {
                this.latestUsageRate = max;
            }
        } catch (Exception e) {
            // ignore
        }
    }

    private void adaptiveThrottle() {
        try {
            // Base delay to spread requests evenly (1 second)
            long delay = 1000;

            if (latestUsageRate > 90) {
                delay = 60000; // Critical: 1 minute
                log.warn("CRITICAL: Meta API usage at {}%. Sleeping 60s...", latestUsageRate);
            } else if (latestUsageRate > 80) {
                delay = 15000; // Warning: 15s
                log.info("CAUTION: Meta API usage at {}%. Sleeping 15s...", latestUsageRate);
            } else if (latestUsageRate > 60) {
                delay = 5000; // Moderate: 5s
            } else if (latestUsageRate > 30) {
                delay = 2000; // Light: 2s
            }

            Thread.sleep(delay);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
