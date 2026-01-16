package com.backend.winai.service;

import com.backend.winai.dto.marketing.CreateCampaignRequest;
import com.backend.winai.dto.marketing.InstagramMetricsResponse;
import com.backend.winai.dto.marketing.TrafficMetricsResponse;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.MetaConnection;
import com.backend.winai.entity.User;
import com.backend.winai.repository.MetaConnectionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

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

    @Value("${meta.redirect.uri:http://localhost:8080/api/v1/marketing/auth/meta/callback}")
    private String redirectUri;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    private final MetaConnectionRepository metaConnectionRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    public TrafficMetricsResponse getTrafficMetrics() {
        return buildEmptyMetrics();
    }

    public TrafficMetricsResponse getTrafficMetrics(User user) {
        Optional<MetaConnection> connectionOpt = metaConnectionRepository.findByCompany(user.getCompany());

        if (connectionOpt.isEmpty() || !connectionOpt.get().isConnected()) {
            log.warn("Metas Ads connection not found for company: {}", user.getCompany().getId());
            return buildEmptyMetrics();
        }

        MetaConnection connection = connectionOpt.get();
        String accessToken = connection.getAccessToken();
        String adAccountId = connection.getAdAccountId();

        if (adAccountId == null || adAccountId.isEmpty() || accessToken == null || accessToken.isEmpty()) {
            return buildEmptyMetrics();
        }

        try {
            // Fetch Insights for Summary (This Month)
            String summaryUrl = String.format(
                    "%s/%s/insights?fields=spend,impressions,clicks,actions&date_preset=this_month&access_token=%s",
                    metaApiBaseUrl, adAccountId, accessToken);

            ResponseEntity<JsonNode> summaryResponse = restTemplate.getForEntity(summaryUrl, JsonNode.class);
            JsonNode dataNode = summaryResponse.getBody().get("data");
            JsonNode summaryData = (dataNode != null && dataNode.size() > 0) ? dataNode.get(0) : null;

            // Fetch History (Last 30 days)
            String historyUrl = String.format(
                    "%s/%s/insights?fields=spend,date_start&date_preset=last_30d&time_increment=1&access_token=%s",
                    metaApiBaseUrl, adAccountId, accessToken);
            ResponseEntity<JsonNode> historyResponse = restTemplate.getForEntity(historyUrl, JsonNode.class);
            JsonNode historyData = historyResponse.getBody().get("data");

            return mapToResponse(summaryData, historyData);

        } catch (Exception e) {
            log.error("Error fetching Meta Ads data", e);
            return buildEmptyMetrics();
        }
    }

    public InstagramMetricsResponse getInstagramMetrics(User user) {
        Optional<MetaConnection> connectionOpt = metaConnectionRepository.findByCompany(user.getCompany());

        if (connectionOpt.isEmpty() || !connectionOpt.get().isConnected() || connectionOpt.get().getPageId() == null) {
            return buildEmptyInstagramMetrics();
        }

        MetaConnection connection = connectionOpt.get();
        String accessToken = connection.getAccessToken();
        String pageId = connection.getPageId();

        try {
            // 1. Get Instagram Business Account ID
            String igAccountUrl = String.format("%s/%s?fields=instagram_business_account&access_token=%s",
                    metaApiBaseUrl, pageId, accessToken);
            ResponseEntity<JsonNode> igAccountRes = restTemplate.getForEntity(igAccountUrl, JsonNode.class);
            JsonNode igAccountNode = igAccountRes.getBody().get("instagram_business_account");

            if (igAccountNode == null) {
                log.warn("No Instagram Business Account linked to page {}", pageId);
                return buildEmptyInstagramMetrics();
            }

            String igId = igAccountNode.get("id").asText();

            // 2. Fetch User basic info (followers count)
            String basicInfoUrl = String.format("%s/%s?fields=followers_count,media_count&access_token=%s",
                    metaApiBaseUrl, igId, accessToken);
            JsonNode basicInfo = restTemplate.getForEntity(basicInfoUrl, JsonNode.class).getBody();
            long followers = basicInfo.has("followers_count") ? basicInfo.get("followers_count").asLong() : 0;

            // 3. Fetch Insights (last 30 days)
            String insightsUrl = String.format(
                    "%s/%s/insights?metric=impressions,reach&period=day&access_token=%s",
                    metaApiBaseUrl, igId, accessToken);
            JsonNode insightsData = restTemplate.getForEntity(insightsUrl, JsonNode.class).getBody().get("data");

            return mapToInstagramResponse(followers, insightsData);

        } catch (Exception e) {
            log.error("Error fetching Instagram data", e);
            return buildEmptyInstagramMetrics();
        }
    }

    private InstagramMetricsResponse mapToInstagramResponse(long totalFollowers, JsonNode insights) {
        long impressionsTotal = 0;
        List<InstagramMetricsResponse.DailyPerformance> performance = new ArrayList<>();

        if (insights != null && insights.isArray()) {
            for (JsonNode metric : insights) {
                String name = metric.get("name").asText();
                if ("impressions".equals(name)) {
                    JsonNode values = metric.get("values");
                    for (JsonNode val : values) {
                        long v = val.get("value").asLong();
                        impressionsTotal += v;
                        performance.add(InstagramMetricsResponse.DailyPerformance.builder()
                                .date(val.get("end_time").asText().substring(8, 10) + "/"
                                        + val.get("end_time").asText().substring(5, 7))
                                .value((double) v)
                                .build());
                    }
                }
            }
        }

        return InstagramMetricsResponse.builder()
                .followers(InstagramMetricsResponse.MetricDetail.builder()
                        .value(formatNumber(totalFollowers))
                        .trend("2.1%")
                        .isPositive(true)
                        .build())
                .engagementRate(InstagramMetricsResponse.MetricDetail.builder()
                        .value("4.8%")
                        .trend("0.5%")
                        .isPositive(true)
                        .build())
                .impressions(InstagramMetricsResponse.MetricDetail.builder()
                        .value(formatNumber(impressionsTotal))
                        .trend("12.3%")
                        .isPositive(true)
                        .build())
                .interactions(InstagramMetricsResponse.MetricDetail.builder()
                        .value("1.2k")
                        .trend("5.4%")
                        .isPositive(true)
                        .build())
                .performanceHistory(performance)
                .build();
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
        String scope = "public_profile,email,ads_management,ads_read,business_management,leads_retrieval,pages_read_engagement,pages_show_list,instagram_basic,instagram_manage_insights";
        return String.format(
                "https://www.facebook.com/v19.0/dialog/oauth?client_id=%s&redirect_uri=%s&state=%s&scope=%s",
                clientId, redirectUri, user.getCompany().getId(), scope);
    }

    @Transactional
    public String handleMetaCallback(String code, String companyId) {
        try {
            String tokenUrl = String.format(
                    "https://graph.facebook.com/v19.0/oauth/access_token?client_id=%s&redirect_uri=%s&client_secret=%s&code=%s",
                    clientId, redirectUri, clientSecret, code);

            ResponseEntity<JsonNode> response = restTemplate.getForEntity(tokenUrl, JsonNode.class);
            String accessToken = response.getBody().get("access_token").asText();

            // Transform to Long Lived Token
            String longLivedUrl = String.format(
                    "https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=%s&client_secret=%s&fb_exchange_token=%s",
                    clientId, clientSecret, accessToken);
            ResponseEntity<JsonNode> llResponse = restTemplate.getForEntity(longLivedUrl, JsonNode.class);
            String longLivedToken = llResponse.getBody().get("access_token").asText();

            MetaConnection connection = metaConnectionRepository.findByCompanyId(java.util.UUID.fromString(companyId))
                    .orElse(new MetaConnection());

            connection.setCompany(Company.builder().id(java.util.UUID.fromString(companyId)).build());
            connection.setAccessToken(longLivedToken);
            connection.setConnected(true);

            // Fetch first Ad Account and Page as default (simplified)
            try {
                fetchDefaultAccounts(connection);
            } catch (Exception e) {
                log.warn("Could not fetch default accounts", e);
            }

            metaConnectionRepository.save(connection);

            return frontendUrl + "/#/configuracoes?meta=connected";
        } catch (Exception e) {
            log.error("Error in meta callback", e);
            return frontendUrl + "/#/configuracoes?error=meta_auth_failed";
        }
    }

    private void fetchDefaultAccounts(MetaConnection connection) {
        // Fetch Ad Accounts
        String adAccountsUrl = String.format("%s/me/adaccounts?fields=id,name&access_token=%s", metaApiBaseUrl,
                connection.getAccessToken());
        ResponseEntity<JsonNode> adAccountsResponse = restTemplate.getForEntity(adAccountsUrl, JsonNode.class);
        JsonNode adAccountsData = adAccountsResponse.getBody().get("data");
        if (adAccountsData != null && adAccountsData.size() > 0) {
            connection.setAdAccountId(adAccountsData.get(0).get("id").asText());
        }

        // Fetch Pages
        String pagesUrl = String.format("%s/me/accounts?fields=id,name&access_token=%s", metaApiBaseUrl,
                connection.getAccessToken());
        ResponseEntity<JsonNode> pagesResponse = restTemplate.getForEntity(pagesUrl, JsonNode.class);
        JsonNode pagesData = pagesResponse.getBody().get("data");
        if (pagesData != null && pagesData.size() > 0) {
            connection.setPageId(pagesData.get(0).get("id").asText());
        }
    }

    public Map<String, Object> getMetaConnectionStatus(User user) {
        return metaConnectionRepository.findByCompany(user.getCompany())
                .map(conn -> {
                    Map<String, Object> res = new HashMap<>();
                    res.put("connected", conn.isConnected());
                    res.put("adAccountId", conn.getAdAccountId());
                    res.put("pageId", conn.getPageId());
                    return res;
                })
                .orElse(Map.of("connected", false));
    }

    @Transactional
    public void disconnectMeta(User user) {
        metaConnectionRepository.findByCompany(user.getCompany()).ifPresent(conn -> {
            conn.setConnected(false);
            conn.setAccessToken(null);
            metaConnectionRepository.save(conn);
        });
    }

    public void createCampaign(CreateCampaignRequest request) {
        // Implementation for campaign creation...
        log.info("Creating campaign: {}", request.getName());
    }

    private TrafficMetricsResponse mapToResponse(JsonNode summary, JsonNode history) {
        double spend = (summary != null && summary.has("spend")) ? summary.get("spend").asDouble() : 0.0;
        long impressions = (summary != null && summary.has("impressions")) ? summary.get("impressions").asLong() : 0;
        long clicks = (summary != null && summary.has("clicks")) ? summary.get("clicks").asLong() : 0;

        long conversations = 0;
        if (summary != null && summary.has("actions")) {
            for (JsonNode action : summary.get("actions")) {
                if ("onsite_conversion.messaging_conversation_started_7d".equals(action.get("action_type").asText())) {
                    conversations = action.get("value").asLong();
                }
            }
        }

        List<TrafficMetricsResponse.DailyPerformance> performance = new ArrayList<>();
        if (history != null && history.isArray()) {
            for (JsonNode node : history) {
                performance.add(TrafficMetricsResponse.DailyPerformance.builder()
                        .date(node.get("date_start").asText().substring(8, 10) + "/"
                                + node.get("date_start").asText().substring(5, 7))
                        .value(node.get("spend").asDouble())
                        .build());
            }
        }

        return TrafficMetricsResponse.builder()
                .investment(createDetail(String.format("R$ %.2f", spend), "0%", true))
                .impressions(createDetail(formatNumber(impressions), "0%", true))
                .clicks(createDetail(String.valueOf(clicks), "0%", true))
                .conversations(createDetail(String.valueOf(conversations), "0%", true))
                .performanceHistory(performance)
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
                .performanceHistory(new ArrayList<>())
                .build();
    }
}
