package com.backend.winai.service;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.InstagramMetric;
import com.backend.winai.entity.MetaCampaign;
import com.backend.winai.entity.MetaConnection;
import com.backend.winai.entity.MetaInsight;
import com.backend.winai.repository.InstagramMetricRepository;
import com.backend.winai.repository.MetaCampaignRepository;
import com.backend.winai.repository.MetaConnectionRepository;
import com.backend.winai.repository.MetaInsightRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.*;

/**
 * Sincroniza campanhas e insights da Meta para o banco de dados.
 * Executado pelo MetaSyncWorker a cada hora.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class MetaSyncService {

    @Value("${meta.api.base-url:https://graph.facebook.com/v19.0}")
    private String metaApiBaseUrl;

    @Value("${meta.api.throttle-delay-ms:2000}")
    private long throttleDelayMs;

    @Value("${meta.api.rate-limit-retry-wait-ms:300000}")
    private long rateLimitRetryWaitMs;

    private final MetaConnectionRepository metaConnectionRepository;
    private final MetaCampaignRepository metaCampaignRepository;
    private final MetaInsightRepository metaInsightRepository;
    private final InstagramMetricRepository instagramMetricRepository;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private volatile long lastRequestTime = 0;

    /**
     * Sincroniza dados da Meta para uma empresa específica (ex: após conectar Meta).
     */
    @Async
    @Transactional
    public void syncForCompany(UUID companyId) {
        metaConnectionRepository.findByCompanyId(companyId)
                .filter(MetaConnection::isConnected)
                .ifPresent(conn -> {
                    if (conn.getAdAccountId() != null) {
                        syncForConnection(conn);
                    }
                    if (conn.getPageId() != null) {
                        syncInstagramForConnection(conn);
                    }
                });
    }

    /**
     * Sincroniza dados da Meta para todas as empresas conectadas.
     */
    @Async
    @Transactional
    public void syncAll() {
        List<MetaConnection> adsConnections = metaConnectionRepository.findByIsConnectedTrueAndAdAccountIdIsNotNull();
        List<MetaConnection> igConnections = metaConnectionRepository.findByIsConnectedTrueAndPageIdIsNotNull();
        log.info("[MetaSync] Iniciando sync - Ads: {} empresas, Instagram: {} empresas", adsConnections.size(), igConnections.size());

        for (MetaConnection conn : adsConnections) {
            try {
                syncForConnection(conn);
            } catch (Exception e) {
                log.error("[MetaSync] Erro ao sincronizar Ads empresa {}: {}", conn.getCompany().getId(), e.getMessage(), e);
            }
        }

        for (MetaConnection conn : igConnections) {
            try {
                syncInstagramForConnection(conn);
            } catch (Exception e) {
                log.error("[MetaSync] Erro ao sincronizar Instagram empresa {}: {}", conn.getCompany().getId(), e.getMessage(), e);
            }
        }

        log.info("[MetaSync] Sync concluído");
    }

    @Transactional
    public void syncForConnection(MetaConnection conn) {
        Company company = conn.getCompany();
        String accessToken = conn.getAccessToken();
        String adAccountId = conn.getAdAccountId();

        if (accessToken == null || accessToken.isEmpty() || adAccountId == null || adAccountId.isEmpty()) {
            return;
        }

        throttle();

        // 0. Buscar nome da conta
        try {
            String accountUrl = String.format("%s/%s?fields=name&access_token=%s",
                    metaApiBaseUrl, adAccountId, accessToken);
            ResponseEntity<String> accRes = getWithRetry(accountUrl);
            if (accRes.getBody() != null) {
                JsonNode accNode = objectMapper.readTree(accRes.getBody());
                if (accNode.has("name")) {
                    conn.setAccountName(accNode.get("name").asText());
                    metaConnectionRepository.save(conn);
                }
            }
        } catch (Exception e) {
            log.debug("Could not fetch account name: {}", e.getMessage());
        }

        throttle();

        // 1. Sincronizar campanhas
        String campaignsUrl = String.format(
                "%s/%s/campaigns?fields=id,name,status,objective,daily_budget,start_time,stop_time,insights%%7Bspend,impressions,reach,clicks,ctr,actions%%7D&date_preset=last_30d&access_token=%s",
                metaApiBaseUrl, adAccountId, accessToken);

        try {
            ResponseEntity<String> response = getWithRetry(campaignsUrl);
            String body = response.getBody();
            if (body == null) return;

            JsonNode root = objectMapper.readTree(body);
            if (root.has("error")) {
                log.warn("[MetaSync] Meta API error para empresa {}: {}", company.getId(), root.get("error"));
                return;
            }

            JsonNode data = root.get("data");
            Set<String> metaIdsFromApi = new HashSet<>();

            if (data != null && data.isArray()) {
                for (JsonNode node : data) {
                    String metaId = node.get("id").asText();
                    metaIdsFromApi.add(metaId);

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
                            ctr = i.has("ctr") ? parseCtr(i.get("ctr").asText()) : 0.0;
                            if (i.has("actions")) {
                                for (JsonNode action : i.get("actions")) {
                                    String at = action.get("action_type").asText();
                                    if ("onsite_conversion.messaging_conversation_started_7d".equals(at)
                                            || "lead".equals(at) || "purchase".equals(at)) {
                                        conversions += action.get("value").asLong();
                                    }
                                }
                            }
                        }
                    }

                    if (dailyBudget <= 0) {
                        dailyBudget = fetchDailyBudgetFromAdSets(metaId, accessToken);
                    }

                    MetaCampaign campaign = metaCampaignRepository.findByMetaId(metaId)
                            .orElse(MetaCampaign.builder()
                                    .company(company)
                                    .metaId(metaId)
                                    .build());

                    campaign.setName(node.has("name") ? node.get("name").asText() : "Campanha");
                    campaign.setStatus(node.has("status") ? node.get("status").asText() : "UNKNOWN");
                    campaign.setObjective(node.has("objective") ? node.get("objective").asText() : "");
                    campaign.setDailyBudget(dailyBudget > 0 ? dailyBudget : null);
                    campaign.setSpend(spend);
                    campaign.setImpressions(impressions);
                    campaign.setReach(reach);
                    campaign.setClicks(clicks);
                    campaign.setCtr(ctr);
                    campaign.setConversions(conversions);
                    campaign.setStartTime(parseZonedDateTime(node, "start_time"));
                    campaign.setStopTime(parseZonedDateTime(node, "stop_time"));

                    metaCampaignRepository.save(campaign);
                }
            }

            // Remover campanhas que não existem mais na Meta
            List<MetaCampaign> existing = metaCampaignRepository.findByCompanyId(company.getId());
            for (MetaCampaign c : existing) {
                if (!metaIdsFromApi.contains(c.getMetaId())) {
                    metaCampaignRepository.delete(c);
                    metaInsightRepository.deleteByCompanyIdAndLevelAndExternalId(
                            company.getId(), "campaign", c.getMetaId());
                }
            }

            // 2. Sincronizar insights da conta (account-level)
            syncAccountInsights(company, adAccountId, accessToken);

            // 3. Sincronizar insights por campanha
            for (String campaignMetaId : metaIdsFromApi) {
                throttle();
                syncCampaignInsights(company, campaignMetaId, accessToken);
            }

        } catch (Exception e) {
            log.error("[MetaSync] Erro ao processar campanhas para empresa {}", company.getId(), e);
            throw new RuntimeException(e);
        }
    }

    private double fetchDailyBudgetFromAdSets(String campaignId, String accessToken) {
        try {
            throttle();
            String url = String.format("%s/%s/adsets?fields=daily_budget&access_token=%s",
                    metaApiBaseUrl, campaignId, accessToken);
            ResponseEntity<String> res = getWithRetry(url);
            if (res.getBody() == null) return 0;
            JsonNode asData = objectMapper.readTree(res.getBody()).get("data");
            if (asData == null || !asData.isArray()) return 0;
            double total = 0;
            for (JsonNode as : asData) {
                if (as.has("daily_budget")) {
                    total += as.get("daily_budget").asDouble() / 100.0;
                }
            }
            return total;
        } catch (Exception e) {
            log.debug("Could not fetch daily budget for campaign {}: {}", campaignId, e.getMessage());
            return 0;
        }
    }

    private void syncAccountInsights(Company company, String adAccountId, String accessToken) {
        try {
            LocalDate end = LocalDate.now();
            LocalDate start = end.minusDays(30);

            String url = String.format(
                    "%s/%s/insights?fields=spend,impressions,clicks,actions,date_start&date_preset=last_30d&time_increment=1&access_token=%s",
                    metaApiBaseUrl, adAccountId, accessToken);

            ResponseEntity<String> res = getWithRetry(url);
            String body = res.getBody();
            if (body == null) return;

            JsonNode data = objectMapper.readTree(body).get("data");
            if (data == null || !data.isArray()) return;

            metaInsightRepository.deleteByCompanyIdAndLevelAndExternalId(company.getId(), "account", adAccountId);

            for (JsonNode node : data) {
                String dateStr = node.has("date_start") ? node.get("date_start").asText() : null;
                if (dateStr == null) continue;

                LocalDate date = LocalDate.parse(dateStr);
                if (date.isBefore(start) || date.isAfter(end)) continue;

                double spend = node.has("spend") ? node.get("spend").asDouble() : 0.0;
                long impressions = node.has("impressions") ? node.get("impressions").asLong() : 0;
                long clicks = node.has("clicks") ? node.get("clicks").asLong() : 0;
                long conversions = 0;
                if (node.has("actions")) {
                    for (JsonNode action : node.get("actions")) {
                        String at = action.get("action_type").asText();
                        if ("onsite_conversion.messaging_conversation_started_7d".equals(at)
                                || "lead".equals(at) || "purchase".equals(at)) {
                            conversions += action.get("value").asLong();
                        }
                    }
                }

                MetaInsight insight = MetaInsight.builder()
                        .company(company)
                        .date(date)
                        .level("account")
                        .externalId(adAccountId)
                        .spend(spend)
                        .impressions(impressions)
                        .clicks(clicks)
                        .conversions(conversions)
                        .build();
                metaInsightRepository.save(insight);
            }
        } catch (Exception e) {
            log.warn("[MetaSync] Erro ao sincronizar insights da conta {}: {}", company.getId(), e.getMessage());
        }
    }

    private void syncCampaignInsights(Company company, String campaignMetaId, String accessToken) {
        try {
            String url = String.format(
                    "%s/%s/insights?fields=spend,impressions,clicks,actions,date_start&date_preset=last_30d&time_increment=1&access_token=%s",
                    metaApiBaseUrl, campaignMetaId, accessToken);

            ResponseEntity<String> res = getWithRetry(url);
            String body = res.getBody();
            if (body == null) return;

            JsonNode data = objectMapper.readTree(body).get("data");
            if (data == null || !data.isArray()) return;

            LocalDate end = LocalDate.now();
            LocalDate start = end.minusDays(30);

            metaInsightRepository.deleteByCompanyIdAndLevelAndExternalId(company.getId(), "campaign", campaignMetaId);

            for (JsonNode node : data) {
                String dateStr = node.has("date_start") ? node.get("date_start").asText() : null;
                if (dateStr == null) continue;

                LocalDate date = LocalDate.parse(dateStr);
                if (date.isBefore(start) || date.isAfter(end)) continue;

                double spend = node.has("spend") ? node.get("spend").asDouble() : 0.0;
                long impressions = node.has("impressions") ? node.get("impressions").asLong() : 0;
                long clicks = node.has("clicks") ? node.get("clicks").asLong() : 0;
                long conversions = 0;
                if (node.has("actions")) {
                    for (JsonNode action : node.get("actions")) {
                        String at = action.get("action_type").asText();
                        if ("onsite_conversion.messaging_conversation_started_7d".equals(at)
                                || "lead".equals(at) || "purchase".equals(at)) {
                            conversions += action.get("value").asLong();
                        }
                    }
                }

                MetaInsight insight = MetaInsight.builder()
                        .company(company)
                        .date(date)
                        .level("campaign")
                        .externalId(campaignMetaId)
                        .spend(spend)
                        .impressions(impressions)
                        .clicks(clicks)
                        .conversions(conversions)
                        .build();
                metaInsightRepository.save(insight);
            }
        } catch (Exception e) {
            log.warn("[MetaSync] Erro ao sincronizar insights da campanha {}: {}", campaignMetaId, e.getMessage());
        }
    }

    private void syncInstagramForConnection(MetaConnection conn) {
        Company company = conn.getCompany();
        String accessToken = conn.getAccessToken();
        String pageId = conn.getPageId();

        if (accessToken == null || accessToken.isEmpty() || pageId == null || pageId.isEmpty()) {
            return;
        }

        try {
            throttle();
            String igAccountUrl = String.format("%s/%s?fields=instagram_business_account&access_token=%s",
                    metaApiBaseUrl, pageId, accessToken);
            ResponseEntity<String> igRes = getWithRetry(igAccountUrl);
            if (igRes.getBody() == null) return;
            JsonNode igRoot = objectMapper.readTree(igRes.getBody());
            if (igRoot.has("error")) {
                log.warn("[MetaSync] Instagram API error para empresa {}: {}", company.getId(), igRoot.get("error"));
                return;
            }
            JsonNode igAccountNode = igRoot.get("instagram_business_account");
            if (igAccountNode == null || igAccountNode.isNull()) return;

            String igId = igAccountNode.get("id").asText();
            conn.setInstagramBusinessId(igId);

            throttle();
            String basicUrl = String.format("%s/%s?fields=followers_count,media_count&access_token=%s",
                    metaApiBaseUrl, igId, accessToken);
            ResponseEntity<String> basicRes = getWithRetry(basicUrl);
            if (basicRes.getBody() != null) {
                JsonNode basic = objectMapper.readTree(basicRes.getBody());
                if (basic.has("followers_count")) {
                    long followers = basic.get("followers_count").asLong();
                    conn.setInstagramFollowerCount(followers);
                    metaConnectionRepository.save(conn);
                }
            }

            LocalDate today = LocalDate.now();
            LocalDate since = today.minusDays(30);

            Map<LocalDate, Long> dailyReach = new HashMap<>();
            Map<LocalDate, Long> dailyEngaged = new HashMap<>();

            throttle();
            String reachUrl = String.format(
                    "%s/%s/insights?metric=reach&metric_type=time_series&period=day&since=%s&until=%s&access_token=%s",
                    metaApiBaseUrl, igId, since, today, accessToken);
            try {
                ResponseEntity<String> reachRes = getWithRetry(reachUrl);
                if (reachRes.getBody() != null) {
                    JsonNode reachData = objectMapper.readTree(reachRes.getBody()).get("data");
                    if (reachData != null && reachData.isArray()) {
                        for (JsonNode metric : reachData) {
                            if (!"reach".equals(metric.has("name") ? metric.get("name").asText() : "")) continue;
                            JsonNode values = metric.has("values") ? metric.get("values") : null;
                            if (values != null && values.isArray()) {
                                for (JsonNode val : values) {
                                    long v = val.has("value") ? val.get("value").asLong() : 0;
                                    String endTime = val.has("end_time") ? val.get("end_time").asText() : "";
                                    if (endTime.length() >= 10) {
                                        LocalDate d = LocalDate.parse(endTime.substring(0, 10));
                                        dailyReach.merge(d, v, Long::sum);
                                    }
                                }
                            }
                            break;
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("[MetaSync] Erro ao buscar reach Instagram: {}", e.getMessage());
            }

            throttle();
            String engagedUrl = String.format(
                    "%s/%s/insights?metric=accounts_engaged&metric_type=time_series&period=day&since=%s&until=%s&access_token=%s",
                    metaApiBaseUrl, igId, since, today, accessToken);
            try {
                ResponseEntity<String> engagedRes = getWithRetry(engagedUrl);
                if (engagedRes.getBody() != null) {
                    JsonNode engagedData = objectMapper.readTree(engagedRes.getBody()).get("data");
                    if (engagedData != null && engagedData.isArray()) {
                        for (JsonNode metric : engagedData) {
                            if (!"accounts_engaged".equals(metric.has("name") ? metric.get("name").asText() : "")) continue;
                            JsonNode values = metric.has("values") ? metric.get("values") : null;
                            if (values != null && values.isArray()) {
                                for (JsonNode val : values) {
                                    long v = val.has("value") ? val.get("value").asLong() : 0;
                                    String endTime = val.has("end_time") ? val.get("end_time").asText() : "";
                                    if (endTime.length() >= 10) {
                                        LocalDate d = LocalDate.parse(endTime.substring(0, 10));
                                        dailyEngaged.merge(d, v, Long::sum);
                                    }
                                }
                            }
                            break;
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("[MetaSync] Erro ao buscar accounts_engaged Instagram: {}", e.getMessage());
            }

            instagramMetricRepository.deleteByCompanyIdAndDateBetween(company.getId(), since, today);

            Set<LocalDate> allDates = new HashSet<>(dailyReach.keySet());
            allDates.addAll(dailyEngaged.keySet());
            for (LocalDate date : allDates) {
                if (date.isBefore(since) || date.isAfter(today)) continue;
                long reach = dailyReach.getOrDefault(date, 0L);
                long engaged = dailyEngaged.getOrDefault(date, 0L);
                InstagramMetric m = InstagramMetric.builder()
                        .company(company)
                        .date(date)
                        .reach(reach)
                        .impressions(reach)
                        .interactions(engaged)
                        .followerCount(conn.getInstagramFollowerCount())
                        .build();
                instagramMetricRepository.save(m);
            }

        } catch (Exception e) {
            log.warn("[MetaSync] Erro ao sincronizar Instagram empresa {}: {}", company.getId(), e.getMessage());
        }
    }

    private double parseCtr(String ctrStr) {
        if (ctrStr == null) return 0;
        try {
            return Double.parseDouble(ctrStr.replace("%", "").trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private ZonedDateTime parseZonedDateTime(JsonNode node, String field) {
        if (!node.has(field) || node.get(field).isNull()) return null;
        try {
            return ZonedDateTime.parse(node.get(field).asText());
        } catch (Exception e) {
            return null;
        }
    }

    private void throttle() {
        long elapsed = System.currentTimeMillis() - lastRequestTime;
        if (throttleDelayMs > 0 && elapsed < throttleDelayMs) {
            try {
                Thread.sleep(throttleDelayMs - elapsed);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
            }
        }
    }

    private ResponseEntity<String> getWithRetry(String url) {
        throttle();
        java.net.URI uri = java.net.URI.create(url);
        int maxAttempts = 3;
        for (int i = 0; i < maxAttempts; i++) {
            try {
                ResponseEntity<String> response = restTemplate.getForEntity(uri, String.class);
                lastRequestTime = System.currentTimeMillis();
                return response;
            } catch (org.springframework.web.client.HttpClientErrorException e) {
                String body = e.getResponseBodyAsString() != null ? e.getResponseBodyAsString() : "";
                boolean isRateLimit = e.getStatusCode().value() == 429
                        || (body.contains("\"code\":17") || body.contains("\"code\": 17"))
                        || (body.contains("\"code\":4") || body.contains("\"code\": 4"));

                if (isRateLimit && i < maxAttempts - 1) {
                    log.warn("[MetaSync] Rate limit. Aguardando {}s antes de retry...", rateLimitRetryWaitMs / 1000);
                    try {
                        Thread.sleep(rateLimitRetryWaitMs);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw e;
                    }
                    continue;
                }
                throw e;
            }
        }
        throw new RuntimeException("Max retries exceeded for Meta API");
    }
}
