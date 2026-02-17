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
import java.time.ZoneId;
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
        log.info("[MetaSync] syncForCompany iniciado - companyId={}", companyId);
        Optional<MetaConnection> connOpt = metaConnectionRepository.findByCompanyId(companyId)
                .filter(MetaConnection::isConnected);
        if (connOpt.isEmpty()) {
            log.warn("[MetaSync] syncForCompany - empresa {} sem conexão Meta ativa, ignorando", companyId);
            return;
        }
        MetaConnection conn = connOpt.get();
        long start = System.currentTimeMillis();
        try {
            if (conn.getAdAccountId() != null) {
                log.info("[MetaSync] syncForCompany - sincronizando Ads para empresa {} (adAccount={})", companyId, conn.getAdAccountId());
                syncForConnection(conn);
            } else {
                log.info("[MetaSync] syncForCompany - empresa {} sem adAccountId, pulando Ads", companyId);
            }
            if (conn.getPageId() != null) {
                log.info("[MetaSync] syncForCompany - sincronizando Instagram para empresa {} (pageId={})", companyId, conn.getPageId());
                syncInstagramForConnection(conn);
            } else {
                log.info("[MetaSync] syncForCompany - empresa {} sem pageId, pulando Instagram", companyId);
            }
            log.info("[MetaSync] syncForCompany concluído - companyId={} em {}ms", companyId, System.currentTimeMillis() - start);
        } catch (Exception e) {
            log.error("[MetaSync] syncForCompany FALHOU - companyId={} em {}ms: {}", companyId, System.currentTimeMillis() - start, e.getMessage(), e);
            throw e;
        }
    }

    /**
     * Sincroniza dados da Meta para todas as empresas conectadas.
     */
    @Async
    @Transactional
    public void syncAll() {
        long syncStart = System.currentTimeMillis();
        List<MetaConnection> adsConnections = metaConnectionRepository.findByIsConnectedTrueAndAdAccountIdIsNotNull();
        List<MetaConnection> igConnections = metaConnectionRepository.findByIsConnectedTrueAndPageIdIsNotNull();
        log.info("[MetaSync] ========== SYNC INICIADO ==========");
        log.info("[MetaSync] Empresas com Ads: {} | Empresas com Instagram: {}", adsConnections.size(), igConnections.size());
        adsConnections.forEach(c -> log.info("[MetaSync] Ads - company={} adAccount={}", c.getCompany().getId(), c.getAdAccountId()));
        igConnections.forEach(c -> log.info("[MetaSync] IG  - company={} pageId={}", c.getCompany().getId(), c.getPageId()));

        int adsOk = 0, adsFail = 0, igOk = 0, igFail = 0;
        for (MetaConnection conn : adsConnections) {
            try {
                syncForConnection(conn);
                adsOk++;
            } catch (Exception e) {
                adsFail++;
                log.error("[MetaSync] ERRO Ads empresa {} ({}): {}", conn.getCompany().getId(), conn.getAdAccountId(), e.getMessage(), e);
            }
        }

        for (MetaConnection conn : igConnections) {
            try {
                syncInstagramForConnection(conn);
                igOk++;
            } catch (Exception e) {
                igFail++;
                log.error("[MetaSync] ERRO Instagram empresa {} ({}): {}", conn.getCompany().getId(), conn.getPageId(), e.getMessage(), e);
            }
        }

        long duration = System.currentTimeMillis() - syncStart;
        log.info("[MetaSync] ========== SYNC CONCLUÍDO em {}ms ==========", duration);
        log.info("[MetaSync] Ads: {} ok, {} falhas | Instagram: {} ok, {} falhas", adsOk, adsFail, igOk, igFail);
    }

    @Transactional
    public void syncForConnection(MetaConnection conn) {
        Company company = conn.getCompany();
        String accessToken = conn.getAccessToken();
        String adAccountId = conn.getAdAccountId();

        if (accessToken == null || accessToken.isEmpty() || adAccountId == null || adAccountId.isEmpty()) {
            log.warn("[MetaSync] syncForConnection - empresa {} sem token ou adAccountId, abortando", company.getId());
            return;
        }

        log.info("[MetaSync] syncForConnection - empresa {} adAccount={} - iniciando", company.getId(), adAccountId);
        throttle();

        // 0. Buscar nome da conta
        try {
            String accountUrl = String.format("%s/%s?fields=name&access_token=%s",
                    metaApiBaseUrl, adAccountId, accessToken);
            ResponseEntity<String> accRes = getWithRetry(accountUrl);
            if (accRes.getBody() != null) {
                JsonNode accNode = objectMapper.readTree(accRes.getBody());
                if (accNode.has("name")) {
                    String accountName = accNode.get("name").asText();
                    conn.setAccountName(accountName);
                    metaConnectionRepository.save(conn);
                    log.info("[MetaSync] Nome da conta: {}", accountName);
                }
            }
        } catch (Exception e) {
            log.warn("[MetaSync] Não foi possível buscar nome da conta: {}", e.getMessage());
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
                log.error("[MetaSync] Meta API error para empresa {}: {}", company.getId(), root.get("error"));
                return;
            }

            JsonNode data = root.get("data");
            Set<String> metaIdsFromApi = new HashSet<>();
            int campaignCount = 0;

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
                    campaignCount++;
                    log.debug("[MetaSync] Campanha: {} | {} | spend={} clicks={} conversions={}", metaId,
                            node.has("name") ? node.get("name").asText() : "?", spend, clicks, conversions);
                }
                log.info("[MetaSync] Campanhas sincronizadas: {} para empresa {}", campaignCount, company.getId());
            } else {
                log.info("[MetaSync] Nenhuma campanha retornada pela Meta para empresa {}", company.getId());
            }

            // Remover campanhas que não existem mais na Meta
            List<MetaCampaign> existing = metaCampaignRepository.findByCompanyId(company.getId());
            int removed = 0;
            for (MetaCampaign c : existing) {
                if (!metaIdsFromApi.contains(c.getMetaId())) {
                    metaCampaignRepository.delete(c);
                    metaInsightRepository.deleteByCompanyIdAndLevelAndExternalId(
                            company.getId(), "campaign", c.getMetaId());
                    removed++;
                }
            }
            if (removed > 0) {
                log.info("[MetaSync] Campanhas removidas (não existem mais na Meta): {}", removed);
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

            int accountInsightsCount = 0;
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
                accountInsightsCount++;
            }
            log.info("[MetaSync] Insights da conta (account-level): {} dias para empresa {}", accountInsightsCount, company.getId());
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

            int campaignInsightsCount = 0;
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
                campaignInsightsCount++;
            }
            log.debug("[MetaSync] Insights campanha {}: {} dias", campaignMetaId, campaignInsightsCount);
        } catch (Exception e) {
            log.warn("[MetaSync] Erro ao sincronizar insights da campanha {}: {}", campaignMetaId, e.getMessage());
        }
    }

    private void syncInstagramForConnection(MetaConnection conn) {
        Company company = conn.getCompany();
        String accessToken = conn.getAccessToken();
        String pageId = conn.getPageId();

        if (accessToken == null || accessToken.isEmpty() || pageId == null || pageId.isEmpty()) {
            log.warn("[MetaSync] syncInstagramForConnection - empresa {} sem token ou pageId, abortando", company.getId());
            return;
        }

        log.info("[MetaSync] syncInstagramForConnection - empresa {} pageId={} - iniciando", company.getId(), pageId);
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
            if (igAccountNode == null || igAccountNode.isNull()) {
                log.warn("[MetaSync] Empresa {} - página {} sem Instagram Business vinculado", company.getId(), pageId);
                return;
            }

            String igId = igAccountNode.get("id").asText();
            conn.setInstagramBusinessId(igId);
            log.info("[MetaSync] Instagram Business ID: {}", igId);

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
                    log.info("[MetaSync] Instagram followers: {} para empresa {}", followers, company.getId());
                }
            }

            LocalDate today = LocalDate.now();
            LocalDate since = today.minusDays(30);
            long sinceUnix = since.atStartOfDay(ZoneId.of("America/Sao_Paulo")).toEpochSecond();
            long untilUnix = today.plusDays(1).atStartOfDay(ZoneId.of("America/Sao_Paulo")).toEpochSecond();

            Map<LocalDate, Long> dailyReach = new HashMap<>();
            Map<LocalDate, Long> dailyEngaged = new HashMap<>();

            throttle();
            String reachUrl = String.format(
                    "%s/%s/insights?metric=reach&metric_type=time_series&period=day&since=%d&until=%d&access_token=%s",
                    metaApiBaseUrl, igId, sinceUnix, untilUnix, accessToken);
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
            // accounts_engaged e total_interactions usam total_value (não suportam time_series)
            long totalEngaged = 0;
            for (String metricName : List.of("accounts_engaged", "total_interactions")) {
                try {
                    String engagedUrl = String.format(
                            "%s/%s/insights?metric=%s&metric_type=total_value&period=day&since=%d&until=%d&access_token=%s",
                            metaApiBaseUrl, igId, metricName, sinceUnix, untilUnix, accessToken);
                    ResponseEntity<String> engagedRes = getWithRetry(engagedUrl);
                    if (engagedRes.getBody() != null) {
                        JsonNode engagedData = objectMapper.readTree(engagedRes.getBody()).get("data");
                        if (engagedData != null && engagedData.isArray()) {
                            for (JsonNode metric : engagedData) {
                                if (!metricName.equals(metric.has("name") ? metric.get("name").asText() : "")) continue;
                                if (metric.has("total_value") && metric.get("total_value").has("value")) {
                                    totalEngaged = metric.get("total_value").get("value").asLong();
                                    log.debug("[MetaSync] {} = {} para empresa {}", metricName, totalEngaged, company.getId());
                                    break;
                                } else if (metric.has("values") && metric.get("values").isArray() && metric.get("values").size() > 0) {
                                    for (JsonNode val : metric.get("values")) {
                                        totalEngaged += val.has("value") ? val.get("value").asLong() : 0;
                                    }
                                    break;
                                }
                            }
                        }
                    }
                    if (totalEngaged > 0) break;
                } catch (Exception e) {
                    log.debug("[MetaSync] {} não disponível: {}", metricName, e.getMessage());
                }
            }
            if (totalEngaged > 0) {
                dailyEngaged.put(today, totalEngaged);
            }

            instagramMetricRepository.deleteByCompanyIdAndDateBetween(company.getId(), since, today);

            int igMetricsCount = 0;
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
                igMetricsCount++;
            }

            long totalReach = dailyReach.values().stream().mapToLong(Long::longValue).sum();
            long totalInteractions = dailyEngaged.values().stream().mapToLong(Long::longValue).sum();
            log.info("[MetaSync] Instagram sincronizado - empresa {} | {} dias | reach={} interactions={}", company.getId(), igMetricsCount, totalReach, totalInteractions);

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
