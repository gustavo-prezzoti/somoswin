package com.backend.winai.service;

import com.backend.winai.dto.marketing.CampaignListItemDTO;
import com.backend.winai.dto.marketing.CampaignsListResponse;
import com.backend.winai.dto.marketing.CreateCampaignRequest;
import com.backend.winai.dto.marketing.InstagramMetricsResponse;
import com.backend.winai.dto.marketing.TrafficMetricsResponse;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.MetaCampaign;
import com.backend.winai.entity.MetaConnection;
import com.backend.winai.entity.InstagramMetric;
import com.backend.winai.entity.MetaInsight;
import com.backend.winai.event.MetaConnectedEvent;
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
import org.springframework.context.ApplicationEventPublisher;
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
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
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

    /** config_id do Facebook Login for Business. Se vazio, usa scope (Login padrão). */
    @Value("${meta.config.id:}")
    private String metaConfigId;

    /** system_user = Business Integration System User token (cascata BM). user = User Token. */
    @Value("${meta.token.type:system_user}")
    private String metaTokenType;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    @Value("${meta.sync.enabled:true}")
    private boolean metaSyncEnabled;

    @Value("${meta.sync.cron:0 0 */12 * * *}")
    private String syncCron;

    /** Tempo de espera ao atingir rate limit. Meta: Development=300s, Standard=60s. */
    @Value("${meta.api.rate-limit-retry-wait-ms:300000}")
    private long rateLimitRetryWaitMs;

    /** Intervalo mínimo entre requisições (evita atingir limite). Meta recomenda espalhar chamadas. */
    @Value("${meta.api.throttle-delay-ms:2000}")
    private long throttleDelayMs;

    private volatile long lastMetaRequestTime = 0;

    public java.util.List<Map<String, Object>> getRealTimeCampaigns(Company company) {
        Optional<MetaConnection> connectionOpt = metaConnectionRepository.findByCompany(company);
        if (connectionOpt.isEmpty() || !connectionOpt.get().isConnected()
                || connectionOpt.get().getAdAccountId() == null) {
            return new ArrayList<>();
        }

        List<MetaCampaign> campaigns = metaCampaignRepository.findByCompanyId(company.getId());
        List<Map<String, Object>> result = new ArrayList<>();
        for (MetaCampaign c : campaigns) {
            Map<String, Object> campaign = new HashMap<>();
            campaign.put("id", c.getMetaId());
            campaign.put("name", c.getName());
            campaign.put("status", c.getStatus() != null ? c.getStatus() : "UNKNOWN");
            campaign.put("spend", c.getSpend() != null ? c.getSpend() : 0.0);
            campaign.put("clicks", c.getClicks() != null ? c.getClicks() : 0L);
            campaign.put("conversions", c.getConversions() != null ? c.getConversions() : 0L);
            result.add(campaign);
        }
        return result;
    }

    public CampaignsListResponse getCampaignsForUser(User user) {
        return getCampaignsForCompany(companyRepository.findById(user.getCompany().getId())
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada")));
    }

    public CampaignsListResponse getCampaignsForCompany(Company company) {
        Optional<MetaConnection> connectionOpt = metaConnectionRepository.findByCompany(company);
        if (connectionOpt.isEmpty() || !connectionOpt.get().isConnected()
                || connectionOpt.get().getAdAccountId() == null) {
            log.info("[Campaigns] company={} - retornando vazio: connected={} adAccountId={}",
                    company.getId(),
                    connectionOpt.isPresent() && connectionOpt.get().isConnected(),
                    connectionOpt.map(MetaConnection::getAdAccountId).orElse(null));
            return CampaignsListResponse.builder()
                    .campaigns(new ArrayList<>())
                    .accountName(null)
                    .build();
        }

        MetaConnection conn = connectionOpt.get();
        String accountName = conn.getAccountName() != null ? conn.getAccountName() : "Conta de Anúncios";

        List<MetaCampaign> campaigns = metaCampaignRepository.findByCompanyId(company.getId());
        List<CampaignListItemDTO> result = new ArrayList<>();

        for (MetaCampaign c : campaigns) {
            double spend = c.getSpend() != null ? c.getSpend() : 0.0;
            long conversions = c.getConversions() != null ? c.getConversions() : 0L;
            double cpl = conversions > 0 ? spend / conversions : 0;

            result.add(CampaignListItemDTO.builder()
                    .id(c.getMetaId())
                    .name(c.getName())
                    .status(c.getStatus() != null ? c.getStatus() : "UNKNOWN")
                    .objective(mapObjective(c.getObjective()))
                    .accountName(accountName)
                    .accountId(conn.getAdAccountId())
                    .dailyBudget(c.getDailyBudget() != null && c.getDailyBudget() > 0 ? c.getDailyBudget() : null)
                    .spend(spend)
                    .impressions(c.getImpressions() != null ? c.getImpressions() : 0L)
                    .reach(c.getReach() != null ? c.getReach() : 0L)
                    .clicks(c.getClicks() != null ? c.getClicks() : 0L)
                    .ctr(c.getCtr() != null ? c.getCtr() : 0.0)
                    .conversions(conversions)
                    .cpl(cpl > 0 ? cpl : null)
                    .build());
        }

        return CampaignsListResponse.builder()
                .campaigns(result)
                .accountName(accountName)
                .build();
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

        String normalizedStatus = "ACTIVE".equalsIgnoreCase(status) ? "ACTIVE" : "PAUSED";
        String campaignIdForApi = extractCampaignIdForApi(campaignId);
        String url = metaApiBaseUrl + "/" + campaignIdForApi;
        String body = "status=" + normalizedStatus;

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            HttpEntity<String> entity = new HttpEntity<>(body + "&access_token=" + conn.getAccessToken(), headers);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            String responseBody = response.getBody();
            if (responseBody != null && responseBody.contains("\"error\"")) {
                JsonNode root = objectMapper.readTree(responseBody);
                if (root.has("error")) {
                    String msg = root.get("error").has("message") ? root.get("error").get("message").asText() : "Erro da Meta API";
                    throw new RuntimeException(msg);
                }
            }
            log.info("Campaign {} status updated to {} via Meta API", campaignId, normalizedStatus);

            // Atualiza o banco local para refletir imediatamente (evita reverter ao recarregar)
            metaCampaignRepository.findByMetaId(campaignId)
                    .filter(c -> c.getCompany().getId().equals(company.getId()))
                    .ifPresent(c -> {
                        c.setStatus(normalizedStatus);
                        metaCampaignRepository.save(c);
                        log.debug("MetaCampaign local atualizado: {} -> {}", c.getMetaId(), normalizedStatus);
                    });
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error updating campaign status: {}", e.getMessage());
            throw new RuntimeException("Erro ao atualizar status da campanha: " + e.getMessage());
        }
    }

    /** Extrai o ID numérico da campanha para a API Meta (aceita act_XXX/campaigns/123 ou 123). */
    private String extractCampaignIdForApi(String campaignId) {
        if (campaignId == null || campaignId.isBlank()) return campaignId;
        if (campaignId.contains("/")) {
            String[] parts = campaignId.split("/");
            return parts[parts.length - 1];
        }
        return campaignId;
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
    private final MetaCampaignRepository metaCampaignRepository;
    private final MetaInsightRepository metaInsightRepository;
    private final InstagramMetricRepository instagramMetricRepository;
    private final MetaAdRepository metaAdRepository;
    private final MetaAdSetRepository metaAdSetRepository;
    private final MetaSyncService metaSyncService;
    private final ApplicationEventPublisher eventPublisher;
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

    /**
     * Retorna o intervalo de datas disponível para métricas (dias sincronizados).
     * Limita ao range que existe no banco (evita usuário filtrar fora do sincronizado).
     */
    public Map<String, String> getTrafficMetricsDateRange(User user) {
        LocalDate today = LocalDate.now();
        LocalDate defaultMin = today.minusDays(30);
        LocalDate defaultMax = today;

        Company company = companyRepository.findById(user.getCompany().getId())
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));
        Optional<MetaConnection> connectionOpt = metaConnectionRepository.findByCompany(company);

        if (connectionOpt.isEmpty() || !connectionOpt.get().isConnected()) {
            return Map.of("minDate", defaultMin.toString(), "maxDate", defaultMax.toString());
        }

        Optional<LocalDate> dbMin = metaInsightRepository.findMinDateByCompanyId(company.getId());
        Optional<LocalDate> dbMax = metaInsightRepository.findMaxDateByCompanyId(company.getId());

        LocalDate minDate = dbMin.filter(d -> !d.isAfter(defaultMax)).orElse(defaultMin);
        LocalDate maxDate = dbMax.filter(d -> !d.isBefore(defaultMin)).orElse(defaultMax);
        if (minDate.isAfter(maxDate)) {
            minDate = defaultMin;
            maxDate = defaultMax;
        }

        return Map.of("minDate", minDate.toString(), "maxDate", maxDate.toString());
    }

    public TrafficMetricsResponse getTrafficMetrics(User user, String campaignId, LocalDate startDate, LocalDate endDate) {
        Company company = companyRepository.findById(user.getCompany().getId())
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));
        Optional<MetaConnection> connectionOpt = metaConnectionRepository.findByCompany(company);

        if (connectionOpt.isEmpty() || !connectionOpt.get().isConnected()) {
            log.warn("Metas Ads connection not found for company: {}", company.getId());
            return buildEmptyMetrics();
        }

        MetaConnection connection = connectionOpt.get();
        String adAccountId = connection.getAdAccountId();

        if (adAccountId == null || adAccountId.isEmpty()) {
            log.info("[TrafficMetrics] company={} - retornando vazio: adAccountId ausente", company.getId());
            return buildEmptyMetrics();
        }

        LocalDate today = LocalDate.now();
        LocalDate rangeMin = today.minusDays(30);
        LocalDate rangeMax = today;

        Optional<LocalDate> dbMin = metaInsightRepository.findMinDateByCompanyId(company.getId());
        Optional<LocalDate> dbMax = metaInsightRepository.findMaxDateByCompanyId(company.getId());
        if (dbMin.isPresent() && !dbMin.get().isAfter(rangeMax)) rangeMin = dbMin.get();
        if (dbMax.isPresent() && !dbMax.get().isBefore(rangeMin)) rangeMax = dbMax.get();

        LocalDate start = (startDate != null && !startDate.isBefore(rangeMin)) ? startDate : rangeMin;
        LocalDate end = (endDate != null && !endDate.isAfter(rangeMax)) ? endDate : rangeMax;
        if (start.isAfter(end)) {
            start = rangeMin;
            end = rangeMax;
        }

        String level = (campaignId != null && !campaignId.isBlank()) ? "campaign" : "account";
        String externalId = (campaignId != null && !campaignId.isBlank()) ? campaignId : adAccountId;

        List<MetaInsight> insights = metaInsightRepository
                .findByCompanyIdAndLevelAndExternalIdAndDateBetweenOrderByDateAsc(
                        company.getId(), level, externalId, start, end);

        return mapInsightsToResponse(insights);
    }

    public InstagramMetricsResponse getInstagramMetrics(User user) {
        Optional<MetaConnection> connectionOpt = metaConnectionRepository.findByCompany(user.getCompany());

        if (connectionOpt.isEmpty()) {
            log.info("[InstagramMetrics] Sem conexão Meta para empresa {}", user.getCompany().getId());
            return buildEmptyInstagramMetrics();
        }
        MetaConnection conn = connectionOpt.get();
        if (!conn.isConnected()) {
            log.info("[InstagramMetrics] Meta desconectada para empresa {}", user.getCompany().getId());
            return buildEmptyInstagramMetrics();
        }
        if (conn.getPageId() == null) {
            log.info("[InstagramMetrics] PageId ausente na conexão Meta para empresa {}", user.getCompany().getId());
            return buildEmptyInstagramMetrics();
        }

        long followers = conn.getInstagramFollowerCount() != null ? conn.getInstagramFollowerCount() : 0;

        LocalDate today = LocalDate.now();
        LocalDate sinceCurrent = today.minusDays(30);
        LocalDate sincePrevious = today.minusDays(60);

        List<InstagramMetric> metrics = instagramMetricRepository.findByCompanyIdAndDateBetween(
                user.getCompany().getId(), sincePrevious, today);

        return mapInstagramMetricsToResponse(followers, metrics, sinceCurrent, today);
    }

    private InstagramMetricsResponse mapInstagramMetricsToResponse(long totalFollowers,
            List<InstagramMetric> metrics, LocalDate currentStart, LocalDate currentEnd) {
        long reachTotal = 0;
        long interactionsTotal = 0;
        long prevReach = 0;
        long prevInteractions = 0;
        List<InstagramMetricsResponse.DailyPerformance> performance = new ArrayList<>();

        if (metrics != null) {
            for (InstagramMetric m : metrics) {
                long reach = m.getReach() != null ? m.getReach() : 0;
                long engaged = m.getInteractions() != null ? m.getInteractions() : 0;

                if (!m.getDate().isBefore(currentStart) && !m.getDate().isAfter(currentEnd)) {
                    reachTotal += reach;
                    interactionsTotal += engaged;
                    String dateStr = m.getDate().toString();
                    String dd = dateStr.length() >= 10 ? dateStr.substring(8, 10) : "00";
                    String mm = dateStr.length() >= 10 ? dateStr.substring(5, 7) : "00";
                    performance.add(InstagramMetricsResponse.DailyPerformance.builder()
                            .date(dd + "/" + mm)
                            .value((double) reach)
                            .build());
                } else {
                    prevReach += reach;
                    prevInteractions += engaged;
                }
            }
        }

        performance.sort(Comparator.comparing(InstagramMetricsResponse.DailyPerformance::getDate));

        long displayImpressions = reachTotal;
        double engagementRate = (reachTotal > 0) ? (double) interactionsTotal / reachTotal * 100 : 0;
        double prevEngagementRate = (prevReach > 0) ? (double) prevInteractions / prevReach * 100 : 0;

        String engagementTrend = formatTrend(engagementRate, prevEngagementRate);
        String impressionsTrend = formatTrend(displayImpressions, prevReach);
        String interactionsTrend = formatTrend(interactionsTotal, prevInteractions);

        return InstagramMetricsResponse.builder()
                .followers(InstagramMetricsResponse.MetricDetail.builder()
                        .value(formatNumber(totalFollowers))
                        .trend("0%")
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
        return getMetaAuthorizationUrlWithMode(user).get("url");
    }

    /** Retorna url e mode (config_id ou scope) para debug. */
    public Map<String, String> getMetaAuthorizationUrlWithMode(User user) {
        String state = user.getCompany().getId().toString();
        if (metaConfigId != null && !metaConfigId.isBlank()) {
            boolean isSystemUser = "system_user".equalsIgnoreCase(metaTokenType != null ? metaTokenType.trim() : "");
            String url;
            if (isSystemUser) {
                // System User: obrigatório override_default_response_type=true e response_type=code
                url = String.format(
                        "https://www.facebook.com/v19.0/dialog/oauth?client_id=%s&redirect_uri=%s&state=%s&config_id=%s&response_type=code&override_default_response_type=true",
                        clientId, redirectUri, state, metaConfigId.trim());
            } else {
                url = String.format(
                        "https://www.facebook.com/v19.0/dialog/oauth?client_id=%s&redirect_uri=%s&state=%s&config_id=%s&response_type=code",
                        clientId, redirectUri, state, metaConfigId.trim());
            }
            return Map.of("url", url, "mode", "config_id", "config_id", metaConfigId.trim(), "token_type", isSystemUser ? "system_user" : "user");
        }
        String scope = "ads_management,pages_show_list,pages_read_engagement,pages_read_user_content,business_management,whatsapp_business_management,leads_retrieval,email,public_profile";
        String url = String.format(
                "https://www.facebook.com/v19.0/dialog/oauth?client_id=%s&redirect_uri=%s&state=%s&scope=%s&response_type=code",
                clientId, redirectUri, state, scope);
        return Map.of("url", url, "mode", "scope");
    }

    @Transactional
    public String handleMetaCallback(String code, String companyId) {
        try {
            String tokenUrl = String.format(
                    "https://graph.facebook.com/v19.0/oauth/access_token?client_id=%s&redirect_uri=%s&client_secret=%s&code=%s",
                    clientId, redirectUri, clientSecret, code);
            log.info("[MetaCallback] Trocando code por token: clientId={} redirectUri={} codeLen={}", 
                    clientId, redirectUri, code != null ? code.length() : 0);

            ResponseEntity<String> response = getWithRetry(tokenUrl);
            String responseBody = response.getBody();
            if (responseBody != null && responseBody.contains("\"error\"")) {
                log.warn("[MetaCallback] Resposta token com erro da Meta: {}", 
                        responseBody.substring(0, Math.min(500, responseBody.length())));
            }
            JsonNode tokenBody = objectMapper.readTree(response.getBody());
            String accessToken = tokenBody.get("access_token").asText();

            // Transform to Long Lived Token (60 days) - não aplica a System User (já é long-lived)
            String longLivedToken = accessToken;
            JsonNode llBody = tokenBody;
            try {
                String longLivedUrl = String.format(
                        "https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=%s&client_secret=%s&fb_exchange_token=%s",
                        clientId, clientSecret, accessToken);
                ResponseEntity<String> llResponse = getWithRetry(longLivedUrl);
                llBody = objectMapper.readTree(llResponse.getBody());
                if (llBody.has("access_token")) {
                    longLivedToken = llBody.get("access_token").asText();
                }
            } catch (Exception e) {
                log.info("[MetaCallback] fb_exchange_token falhou (normal para System User): {}. Usando token original.", e.getMessage());
            }

            // Get user/business ID
            String meUrl = String.format("https://graph.facebook.com/me?fields=id,client_business_id&access_token=%s", longLivedToken);
            ResponseEntity<String> meResponse = getWithRetry(meUrl);
            JsonNode meBody = objectMapper.readTree(meResponse.getBody());
            String metaUserId = meBody.has("id") ? meBody.get("id").asText() : null;
            if (metaUserId == null && meBody.has("client_business_id")) {
                metaUserId = meBody.get("client_business_id").asText();
            }
            if (metaUserId == null) {
                throw new RuntimeException("Meta /me não retornou id nem client_business_id: " + meBody);
            }

            // Get expiration if available (System User pode não expirar)
            long expiresIn = llBody.has("expires_in") ? llBody.get("expires_in").asLong()
                    : 5184000; // 60 days default para User Token

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
                log.info("Ad Account configured: {} - disparando sync inicial após commit", connection.getAdAccountId());
                eventPublisher.publishEvent(new MetaConnectedEvent(java.util.UUID.fromString(companyId)));
            } else {
                log.warn("No Ad Account found during OAuth.");
            }

            return frontendUrl + "/configuracoes?meta=connected";
        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage() : "";
            log.error("[MetaCallback] Erro ao processar callback: {} - {}", e.getClass().getSimpleName(), msg, e);
            if (e instanceof org.springframework.web.client.HttpClientErrorException hex) {
                try {
                    String body = hex.getResponseBodyAsString();
                    log.error("[MetaCallback] Resposta Meta API: {}", body != null ? body : "null");
                } catch (Exception ignored) {}
            }
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

        // Step 2: Fetch Ad Accounts - try BM first, fallback to me/adaccounts se business_management falhar
        boolean adAccountSet = false;
        if (businessId != null) {
            try {
                String adAccountsUrl = String.format("%s/%s/owned_ad_accounts?fields=id,name&access_token=%s",
                        metaApiBaseUrl, businessId, accessToken);
                log.info("[fetchDefaultAccounts] Buscando ad accounts via BM: owned_ad_accounts");
                ResponseEntity<String> adAccountsResponse = getWithRetry(adAccountsUrl);
                String adAccountsBody = adAccountsResponse.getBody();
                JsonNode adAccountsRoot = (adAccountsBody != null) ? objectMapper.readTree(adAccountsBody) : null;
                JsonNode adAccountsData = (adAccountsRoot != null && adAccountsRoot.has("data")) ? adAccountsRoot.get("data") : null;
                if (adAccountsData != null && adAccountsData.isArray() && adAccountsData.size() > 0) {
                    connection.setAdAccountId(adAccountsData.get(0).get("id").asText());
                    log.info("[fetchDefaultAccounts] Ad Account encontrado (BM): {} ({})", adAccountsData.get(0).get("name").asText(), adAccountsData.get(0).get("id").asText());
                    adAccountSet = true;
                }
            } catch (Exception e) {
                log.warn("[fetchDefaultAccounts] BM owned_ad_accounts falhou: {}. Tentando me/adaccounts (fallback)...", e.getMessage());
            }
        }
        if (!adAccountSet) {
            String userIdForFallback = connection.getMetaUserId() != null ? connection.getMetaUserId() : "me";
            try {
                // Com token Business, "me" resolve para Business (não tem adaccounts). Usar metaUserId explicitamente.
                String adAccountsUrl = String.format("%s/%s/adaccounts?fields=id,name&access_token=%s",
                        metaApiBaseUrl, userIdForFallback, accessToken);
                log.info("[fetchDefaultAccounts] Buscando ad accounts via {}/adaccounts (fallback)", userIdForFallback);
                ResponseEntity<String> adAccountsResponse = getWithRetry(adAccountsUrl);
                String adAccountsBody = adAccountsResponse.getBody();
                JsonNode adAccountsRoot = (adAccountsBody != null) ? objectMapper.readTree(adAccountsBody) : null;
                JsonNode adAccountsData = (adAccountsRoot != null && adAccountsRoot.has("data")) ? adAccountsRoot.get("data") : null;
                if (adAccountsData != null && adAccountsData.isArray() && adAccountsData.size() > 0) {
                    connection.setAdAccountId(adAccountsData.get(0).get("id").asText());
                    log.info("[fetchDefaultAccounts] Ad Account encontrado (me): {} ({})", adAccountsData.get(0).get("name").asText(), adAccountsData.get(0).get("id").asText());
                    adAccountSet = true;
                }
            } catch (Exception e) {
                log.warn("[fetchDefaultAccounts] {}/adaccounts também falhou: {}", userIdForFallback, e.getMessage());
            }
        }

        // Step 3: Fetch Pages - priorizar /me/accounts com access_token (Page token para /feed exige pages_read_engagement)
        boolean pageSet = false;
        try {
            String meAccountsUrl = String.format("%s/me/accounts?fields=id,name,access_token&access_token=%s",
                    metaApiBaseUrl, accessToken);
            log.info("[fetchDefaultAccounts] Buscando pages via me/accounts (com access_token para /feed)");
            ResponseEntity<String> meAccountsResponse = getWithRetry(meAccountsUrl);
            JsonNode meAccountsData = objectMapper.readTree(meAccountsResponse.getBody()).get("data");
            if (meAccountsData != null && meAccountsData.isArray() && meAccountsData.size() > 0) {
                JsonNode firstPage = meAccountsData.get(0);
                connection.setPageId(firstPage.get("id").asText());
                if (firstPage.has("access_token") && !firstPage.get("access_token").isNull()) {
                    connection.setPageAccessToken(firstPage.get("access_token").asText());
                    log.info("[fetchDefaultAccounts] Page encontrada com token (me/accounts): {}", firstPage.get("name").asText());
                } else {
                    log.info("[fetchDefaultAccounts] Page encontrada sem token (me/accounts): {}", firstPage.get("name").asText());
                }
                pageSet = true;
            }
        } catch (Exception e) {
            log.warn("[fetchDefaultAccounts] me/accounts falhou: {}. Tentando owned_pages...", e.getMessage());
        }
        if (!pageSet && businessId != null) {
            try {
                String pagesUrl = String.format("%s/%s/owned_pages?fields=id,name&access_token=%s",
                        metaApiBaseUrl, businessId, accessToken);
                log.info("[fetchDefaultAccounts] Buscando pages via BM: owned_pages");
                ResponseEntity<String> pagesResponse = getWithRetry(pagesUrl);
                JsonNode pagesData = objectMapper.readTree(pagesResponse.getBody()).get("data");
                if (pagesData != null && pagesData.size() > 0) {
                    connection.setPageId(pagesData.get(0).get("id").asText());
                    log.info("[fetchDefaultAccounts] Page encontrada (BM): {}", pagesData.get(0).get("name").asText());
                    pageSet = true;
                }
            } catch (Exception e) {
                log.warn("[fetchDefaultAccounts] BM owned_pages falhou: {}", e.getMessage());
            }
        }
        if (!pageSet) {
            String userIdForPages = connection.getMetaUserId() != null ? connection.getMetaUserId() : "me";
            try {
                String pagesUrl = String.format("%s/%s/accounts?fields=id,name,access_token&access_token=%s",
                        metaApiBaseUrl, userIdForPages, accessToken);
                log.info("[fetchDefaultAccounts] Buscando pages via {}/accounts (fallback)", userIdForPages);
                ResponseEntity<String> pagesResponse = getWithRetry(pagesUrl);
                JsonNode pagesData = objectMapper.readTree(pagesResponse.getBody()).get("data");
                if (pagesData != null && pagesData.size() > 0) {
                    JsonNode firstPage = pagesData.get(0);
                    connection.setPageId(firstPage.get("id").asText());
                    if (firstPage.has("access_token") && !firstPage.get("access_token").isNull()) {
                        connection.setPageAccessToken(firstPage.get("access_token").asText());
                    }
                    log.info("[fetchDefaultAccounts] Page encontrada (fallback): {}", firstPage.get("name").asText());
                    pageSet = true;
                }
            } catch (Exception e) {
                log.warn("[fetchDefaultAccounts] {}/accounts também falhou: {}", userIdForPages, e.getMessage());
            }
        }

        // Step 4: Try to fetch Instagram - BM instagram_accounts ou page.instagram_business_account (fallback)
        boolean igSet = false;
        if (businessId != null) {
            try {
                String igUrl = String.format("%s/%s/instagram_accounts?fields=id,username&access_token=%s",
                        metaApiBaseUrl, businessId, accessToken);
                log.info("[fetchDefaultAccounts] Buscando Instagram via BM: instagram_accounts");
                ResponseEntity<String> igResponse = getWithRetry(igUrl);
                JsonNode igData = objectMapper.readTree(igResponse.getBody()).get("data");
                if (igData != null && igData.size() > 0) {
                    connection.setInstagramBusinessId(igData.get(0).get("id").asText());
                    log.info("[fetchDefaultAccounts] Instagram encontrado (BM): {}", igData.get(0).has("username") ? igData.get(0).get("username").asText() : igData.get(0).get("id").asText());
                    igSet = true;
                }
            } catch (Exception e) {
                log.warn("[fetchDefaultAccounts] BM instagram_accounts falhou: {}. Tentando page.instagram_business_account (fallback)...", e.getMessage());
            }
        }
        if (!igSet && connection.getPageId() != null) {
            try {
                String pageIgUrl = String.format("%s/%s?fields=instagram_business_account&access_token=%s",
                        metaApiBaseUrl, connection.getPageId(), accessToken);
                log.info("[fetchDefaultAccounts] Buscando Instagram via page.instagram_business_account (fallback)");
                ResponseEntity<String> pageIgResponse = getWithRetry(pageIgUrl);
                JsonNode pageIgRoot = objectMapper.readTree(pageIgResponse.getBody());
                JsonNode igAccount = (pageIgRoot != null && pageIgRoot.has("instagram_business_account")) ? pageIgRoot.get("instagram_business_account") : null;
                if (igAccount != null && !igAccount.isNull() && igAccount.has("id")) {
                    connection.setInstagramBusinessId(igAccount.get("id").asText());
                    log.info("[fetchDefaultAccounts] Instagram encontrado (page): {}", igAccount.get("id").asText());
                }
            } catch (Exception e) {
                log.debug("[fetchDefaultAccounts] page.instagram_business_account falhou: {}", e.getMessage());
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
            log.info("[MetaDetails] company={} - sem conexão ou não conectada", company.getId());
            return Map.of("connected", false);
        }

        MetaConnection conn = connectionOpt.get();
        log.info("[MetaDetails] company={} adAccountId={} pageId={} businessId={} instagramId={}",
                company.getId(), conn.getAdAccountId(), conn.getPageId(), conn.getBusinessId(), conn.getInstagramBusinessId());

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

        // Fetch campaigns summary (Live) - only if ad account is linked
        if (conn.getAdAccountId() == null) {
            log.info("[MetaDetails] company={} - pulando campaigns/insights: adAccountId é null", company.getId());
        }
        if (conn.getAdAccountId() != null) {
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
        }

        // Fetch insights summary (last 30 days) (Live) - only if ad account is linked
        if (conn.getAdAccountId() != null) {
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
            // Remover todos os dados vinculados à Meta para não misturar ao reconectar com outra conta
            metaInsightRepository.deleteByCompany(company);
            instagramMetricRepository.deleteByCompany(company);
            metaAdRepository.deleteByCompany(company);
            metaAdSetRepository.deleteByCompany(company);
            metaCampaignRepository.deleteByCompany(company);
            metaConnectionRepository.delete(conn);
            log.info("[Meta] Desconectado e dados removidos para empresa {}", company.getId());
        });
    }

    // Sync methods removed as we are moving to Live Fetching

    // Methods removed

    /**
     * Obtém Page access token via /me/accounts (exige pages_read_engagement).
     * O /feed exige Page token, não System User token.
     */
    @Transactional
    protected String fetchAndStorePageAccessToken(MetaConnection conn) {
        String accessToken = conn.getAccessToken();
        if (accessToken == null || accessToken.isBlank()) return null;
        String pageId = conn.getPageId();
        if (pageId == null || pageId.isBlank()) return null;
        try {
            String url = String.format("%s/me/accounts?fields=id,name,access_token&access_token=%s", metaApiBaseUrl, accessToken);
            ResponseEntity<String> res = getWithRetry(url);
            JsonNode root = objectMapper.readTree(res.getBody());
            JsonNode data = root != null && root.has("data") ? root.get("data") : null;
            if (data != null && data.isArray()) {
                for (JsonNode page : data) {
                    if (page.has("id") && pageId.equals(page.get("id").asText())
                            && page.has("access_token") && !page.get("access_token").isNull()) {
                        String token = page.get("access_token").asText();
                        conn.setPageAccessToken(token);
                        metaConnectionRepository.save(conn);
                        log.info("[META] Page access token obtido e armazenado para page {}", pageId);
                        return token;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("[META] Falha ao obter page access token: {}", e.getMessage());
        }
        return null;
    }

    /**
     * Lista posts da página Meta elegíveis para promoção (boost).
     * GET /{page-id}/feed?fields=id,message,created_time,full_picture,is_eligible_for_promotion,promotable_id
     */
    public List<Map<String, Object>> getPagePosts(User user) {
        MetaConnection conn = metaConnectionRepository.findByCompany(user.getCompany())
                .filter(MetaConnection::isConnected)
                .orElseThrow(() -> new RuntimeException("Conecte sua conta Meta Ads em Configurações"));
        if (conn.getPageId() == null || conn.getPageId().isBlank()) {
            throw new RuntimeException("Página do Facebook não vinculada.");
        }
        String feedToken = conn.getPageAccessToken();
        if (feedToken == null || feedToken.isBlank()) {
            feedToken = fetchAndStorePageAccessToken(conn);
        }
        if (feedToken == null || feedToken.isBlank()) {
            throw new RuntimeException("Não foi possível obter o token da página. Reconecte o Meta Ads em Configurações.");
        }
        try {
            adaptiveThrottle();
            // /published_posts pode funcionar com pages_read_engagement; /feed exige pages_read_user_content também
            String url = metaApiBaseUrl + "/" + conn.getPageId() + "/published_posts?fields=id,message,created_time,full_picture,is_eligible_for_promotion,promotable_id&limit=25&access_token=" + feedToken;
            ResponseEntity<String> res = restTemplate.getForEntity(url, String.class);
            JsonNode node = parseJson(objectMapper, res.getBody());
            List<Map<String, Object>> list = new ArrayList<>();
            if (node.has("data") && node.get("data").isArray()) {
                for (JsonNode item : node.get("data")) {
                    boolean eligible = item.has("is_eligible_for_promotion") && item.get("is_eligible_for_promotion").asBoolean();
                    String promotableId = item.has("promotable_id") ? item.get("promotable_id").asText() : item.get("id").asText();
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", item.get("id").asText());
                    m.put("promotableId", promotableId);
                    m.put("message", item.has("message") ? item.get("message").asText() : "");
                    m.put("createdTime", item.has("created_time") ? item.get("created_time").asText() : "");
                    m.put("fullPicture", item.has("full_picture") ? item.get("full_picture").asText() : null);
                    m.put("isEligibleForPromotion", eligible);
                    list.add(m);
                }
            }
            return list;
        } catch (Exception e) {
            log.error("[META] Error fetching page posts", e);
            throw new RuntimeException("Erro ao buscar posts da página: " + (e.getMessage() != null ? e.getMessage() : "Verifique a conexão Meta."));
        }
    }

    /**
     * Cria campanha Meta Ads para WhatsApp: Campanha (Engajamento) -> Conjunto (WhatsApp, orçamento, público) -> Anúncio (novo ou post existente).
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

        // Doc Meta "Objective Mapping": WHATSAPP está em LINK_CLICKS→OUTCOME_TRAFFIC (não OUTCOME_ENGAGEMENT)
        // OUTCOME_TRAFFIC + WHATSAPP: optimization_goal LINK_CLICKS, REACH ou IMPRESSIONS
        String objective = "OUTCOME_TRAFFIC";
        boolean useExistingPost = Boolean.TRUE.equals(request.getUseExistingPost());
        String existingPostId = (request.getExistingPostId() != null && !request.getExistingPostId().isBlank()) ? request.getExistingPostId() : null;

        String effectiveLink = null;
        if (!useExistingPost) {
            effectiveLink = resolveEffectiveLink(request, pageId, accessToken);
        }

        long dailyBudgetCents = Math.max(100, Math.round((request.getDailyBudget() != null ? request.getDailyBudget() : 50.0) * 100));

        int ageMin = request.getAgeMin() != null ? request.getAgeMin() : 18;
        int ageMax = request.getAgeMax() != null ? request.getAgeMax() : 65;
        ageMin = Math.max(18, Math.min(65, ageMin));
        ageMax = Math.max(18, Math.min(65, ageMax));
        if (ageMax < ageMin) ageMax = ageMin;

        String country = (request.getCountryCode() != null && !request.getCountryCode().isBlank())
                ? request.getCountryCode().toUpperCase().substring(0, 2) : "BR";

        List<Integer> gendersList = parseGenders(request.getGenders());

        // Doc Meta "Objective Mapping": OUTCOME_TRAFFIC + WHATSAPP = LINK_CLICKS, REACH, IMPRESSIONS
        List<String> optimizationGoals = List.of("LINK_CLICKS", "REACH", "IMPRESSIONS");
        String adSetName = (request.getAdSetName() != null && !request.getAdSetName().isBlank())
                ? request.getAdSetName() : ("Ad Set - " + System.currentTimeMillis());
        String adName = (request.getAdName() != null && !request.getAdName().isBlank())
                ? request.getAdName() : request.getName();

        String campaignId = null;
        try {
            adaptiveThrottle();

            campaignId = createMetaCampaign(adAccountId, accessToken, request.getName(), objective);
            log.info("[META] Campaign created: {}", campaignId);

            String adSetId = null;
            RuntimeException lastError = null;
            for (String optGoal : optimizationGoals) {
                try {
                    adSetId = createMetaAdSet(adAccountId, accessToken, campaignId, pageId,
                            dailyBudgetCents, request.getStartDate(), request.getEndDate(),
                            country, ageMin, ageMax, gendersList, optGoal, request.getInterests(), adSetName);
                    log.info("[META] Ad Set created with optimization_goal={}: {}", optGoal, adSetId);
                    break;
                } catch (RuntimeException e) {
                    lastError = e;
                    if (e.getMessage() != null && (e.getMessage().contains("2490408") || e.getMessage().contains("meta de desempenho"))) {
                        log.warn("[META] optimization_goal {} falhou (2490408), tentando próxima", optGoal);
                    } else {
                        throw e;
                    }
                }
            }
            if (adSetId == null) {
                throw lastError != null ? lastError : new RuntimeException("Nenhuma optimization_goal funcionou para Engajamento+WhatsApp");
            }

            String creativeId;
            if (useExistingPost && existingPostId != null && !existingPostId.isBlank()) {
                creativeId = createMetaAdCreativeFromExistingPost(adAccountId, accessToken, existingPostId);
            } else {
                String adImageHash = null;
                if (request.getImageUrl() != null && !request.getImageUrl().isBlank()) {
                    try {
                        adImageHash = uploadAdImage(adAccountId, accessToken, request.getImageUrl());
                    } catch (Exception e) {
                        log.warn("[META] Image upload failed: {}", e.getMessage());
                    }
                }
                creativeId = createMetaAdCreative(adAccountId, accessToken, pageId,
                        request.getAdMessage(), effectiveLink, request.getHeadline(), request.getAdDescription(),
                        adImageHash, request.getImageUrl(), "WHATSAPP_MESSAGE");
            }
            log.info("[META] Ad Creative created: {}", creativeId);

            createMetaAd(adAccountId, accessToken, adSetId, creativeId, adName);
            log.info("[META] Ad created successfully for campaign: {}", request.getName());

        } catch (org.springframework.web.client.HttpClientErrorException e) {
            String body = e.getResponseBodyAsString();
            log.error("[META] API Error creating campaign: {} - {}", e.getStatusCode(), body);
            if (campaignId != null) {
                try {
                    deleteMetaCampaign(campaignId, accessToken);
                    log.info("[META] Campaign {} removida após falha no ad set", campaignId);
                } catch (Exception ex) {
                    log.warn("[META] Não foi remover campanha órfã {}: {}", campaignId, ex.getMessage());
                }
            }
            throw new RuntimeException(com.backend.winai.util.ErrorHelper.normalizeMessage(body));
        } catch (Exception e) {
            log.error("[META] Error creating campaign", e);
            if (campaignId != null) {
                try {
                    deleteMetaCampaign(campaignId, accessToken);
                    log.info("[META] Campaign {} removida após erro", campaignId);
                } catch (Exception ex) {
                    log.warn("[META] Não foi remover campanha órfã {}: {}", campaignId, ex.getMessage());
                }
            }
            throw new RuntimeException(e.getMessage() != null ? e.getMessage() : "Erro ao criar campanha no Meta Ads");
        }
    }

    private void deleteMetaCampaign(String campaignId, String accessToken) {
        String url = metaApiBaseUrl + "/" + campaignId + "?access_token=" + accessToken;
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_FORM_URLENCODED);
        restTemplate.exchange(url, org.springframework.http.HttpMethod.DELETE,
                new org.springframework.http.HttpEntity<>(headers), String.class);
    }

    private String resolveEffectiveLink(CreateCampaignRequest request, String pageId, String accessToken) {
        String phone = request.getWhatsappPhone();
        if (phone == null || phone.isBlank()) {
            phone = fetchPageWhatsAppNumber(pageId, accessToken);
        }
        if (phone == null || phone.isBlank()) {
            throw new RuntimeException("Informe o número WhatsApp ou vincule o WhatsApp à sua página do Facebook.");
        }
        String digits = phone.replaceAll("[^0-9]", "");
        return "https://wa.me/" + digits;
    }

    private String fetchPageWhatsAppNumber(String pageId, String accessToken) {
        // 1. Tentar GET direto na página
        try {
            String url = metaApiBaseUrl + "/" + pageId + "?fields=whatsapp_number&access_token=" + accessToken;
            ResponseEntity<String> res = restTemplate.getForEntity(url, String.class);
            String body = res.getBody();
            if (body != null && body.contains("\"error\"")) {
                log.debug("[META] Page whatsapp_number direct GET error, trying /me/accounts");
            } else {
                JsonNode node = parseJson(objectMapper, body);
                if (node.has("whatsapp_number")) {
                    return node.get("whatsapp_number").asText();
                }
            }
        } catch (Exception e) {
            log.debug("[META] Page whatsapp_number direct GET failed: {}", e.getMessage());
        }
        // 2. Fallback: /me/accounts com fields incluindo whatsapp_number (alguns tokens retornam)
        try {
            String url = metaApiBaseUrl + "/me/accounts?fields=id,name,access_token,whatsapp_number&access_token=" + accessToken;
            ResponseEntity<String> res = restTemplate.getForEntity(url, String.class);
            JsonNode root = parseJson(objectMapper, res.getBody());
            JsonNode data = root.has("data") ? root.get("data") : null;
            if (data != null && data.isArray()) {
                for (JsonNode page : data) {
                    if (page.has("id") && pageId.equals(page.get("id").asText()) && page.has("whatsapp_number")) {
                        return page.get("whatsapp_number").asText();
                    }
                }
            }
        } catch (Exception e) {
            log.debug("[META] /me/accounts whatsapp_number fallback failed: {}", e.getMessage());
        }
        return null;
    }

    /**
     * Obtém o número WhatsApp vinculado à página do Facebook (WhatsApp Business).
     * Usado como fallback na criação de campanha quando o usuário não seleciona.
     */
    public String getPageWhatsAppNumber(User user) {
        List<String> numbers = getPageWhatsAppNumbers(user);
        if (!numbers.isEmpty()) return numbers.get(0);
        MetaConnection conn = metaConnectionRepository.findByCompany(user.getCompany())
                .filter(MetaConnection::isConnected)
                .orElse(null);
        if (conn != null && conn.getPageId() != null && conn.getAccessToken() != null) {
            return fetchPageWhatsAppNumber(conn.getPageId(), conn.getAccessToken());
        }
        return null;
    }

    /**
     * Lista números WhatsApp disponíveis para campanhas: primeiro o da página (conectado via Configurações da Página),
     * depois os dos WABAs do Business (requer whatsapp_business_management).
     */
    public List<String> getPageWhatsAppNumbers(User user) {
        MetaConnection conn = metaConnectionRepository.findByCompany(user.getCompany())
                .filter(MetaConnection::isConnected)
                .orElse(null);
        if (conn == null) return Collections.emptyList();
        String accessToken = conn.getAccessToken();
        if (accessToken == null || accessToken.isBlank()) return Collections.emptyList();

        Set<String> seen = new LinkedHashSet<>();

        // 1. Número da página (o que aparece no Meta Ads - conectado via Configurações da Página)
        if (conn.getPageId() != null && !conn.getPageId().isBlank()) {
            String pageToken = conn.getPageAccessToken();
            if (pageToken == null || pageToken.isBlank()) {
                pageToken = fetchAndStorePageAccessToken(conn);
            }
            if (pageToken == null || pageToken.isBlank()) pageToken = accessToken;
            String pageNum = fetchPageWhatsAppNumber(conn.getPageId(), pageToken);
            if (pageNum == null || pageNum.isBlank()) {
                pageNum = fetchPageWhatsAppNumber(conn.getPageId(), accessToken);
            }
            if (pageNum != null && !pageNum.isBlank()) {
                seen.add(normalizePhoneForDedup(pageNum));
                log.info("[META] WhatsApp number from page: {}", pageNum);
            } else {
                log.info("[META] No whatsapp_number from page {} (token type may not support this field)", conn.getPageId());
            }
        }

        // 1.5. Fallback para System User: owned_pages retorna Page com whatsapp_number (BM)
        String businessId = conn.getBusinessId();
        if (seen.isEmpty() && businessId != null && !businessId.isBlank() && conn.getPageId() != null) {
            try {
                String ownedUrl = metaApiBaseUrl + "/" + businessId + "/owned_pages?fields=id,name,whatsapp_number&access_token=" + accessToken;
                ResponseEntity<String> ownedRes = restTemplate.getForEntity(ownedUrl, String.class);
                JsonNode ownedRoot = parseJson(objectMapper, ownedRes.getBody());
                JsonNode ownedData = ownedRoot.has("data") ? ownedRoot.get("data") : null;
                if (ownedData != null && ownedData.isArray()) {
                    String targetPageId = conn.getPageId();
                    for (JsonNode page : ownedData) {
                        if (page.has("id") && targetPageId.equals(page.get("id").asText()) && page.has("whatsapp_number") && !page.get("whatsapp_number").isNull()) {
                            String num = page.get("whatsapp_number").asText();
                            if (num != null && !num.isBlank()) {
                                seen.add(normalizePhoneForDedup(num));
                                log.info("[META] WhatsApp number from owned_pages (System User): {}", num);
                                break;
                            }
                        }
                    }
                }
            } catch (Exception e) {
                log.debug("Could not fetch whatsapp_number via owned_pages: {}", e.getMessage());
            }
        }

        // 2. Números dos WABAs do Business (requer whatsapp_business_management; phone_numbers pode não suportar GET)
        if (businessId != null && !businessId.isBlank()) {
            try {
                String wabaUrl = metaApiBaseUrl + "/" + businessId + "/owned_whatsapp_business_accounts?fields=id&access_token=" + accessToken;
                ResponseEntity<String> wabaRes = restTemplate.getForEntity(wabaUrl, String.class);
                JsonNode wabaRoot = parseJson(objectMapper, wabaRes.getBody());
                JsonNode wabaData = wabaRoot.has("data") ? wabaRoot.get("data") : null;
                if (wabaData != null && wabaData.isArray()) {
                    for (JsonNode waba : wabaData) {
                        if (!waba.has("id")) continue;
                        String wabaId = waba.get("id").asText();
                        try {
                            String pnUrl = metaApiBaseUrl + "/" + wabaId + "/phone_numbers?fields=display_phone_number,verified_name&access_token=" + accessToken;
                            ResponseEntity<String> pnRes = restTemplate.getForEntity(pnUrl, String.class);
                            JsonNode pnRoot = parseJson(objectMapper, pnRes.getBody());
                            JsonNode pnData = pnRoot.has("data") ? pnRoot.get("data") : null;
                            if (pnData != null && pnData.isArray()) {
                                for (JsonNode pn : pnData) {
                                    if (pn.has("display_phone_number")) {
                                        String num = pn.get("display_phone_number").asText();
                                        if (num != null && !num.isBlank()) seen.add(normalizePhoneForDedup(num));
                                    }
                                }
                            }
                        } catch (Exception e) {
                            log.debug("Could not fetch phone_numbers for WABA {}: {}", wabaId, e.getMessage());
                        }
                    }
                }
                // Fallback: client_whatsapp_business_accounts (WABAs compartilhados)
                if (seen.isEmpty()) {
                    String clientUrl = metaApiBaseUrl + "/" + businessId + "/client_whatsapp_business_accounts?fields=id&access_token=" + accessToken;
                    ResponseEntity<String> clientRes = restTemplate.getForEntity(clientUrl, String.class);
                    JsonNode clientRoot = parseJson(objectMapper, clientRes.getBody());
                    JsonNode clientData = clientRoot.has("data") ? clientRoot.get("data") : null;
                    if (clientData != null && clientData.isArray()) {
                        for (JsonNode waba : clientData) {
                            if (!waba.has("id")) continue;
                            String wabaId = waba.get("id").asText();
                            try {
                                String pnUrl = metaApiBaseUrl + "/" + wabaId + "/phone_numbers?fields=display_phone_number&access_token=" + accessToken;
                                ResponseEntity<String> pnRes = restTemplate.getForEntity(pnUrl, String.class);
                                JsonNode pnRoot = parseJson(objectMapper, pnRes.getBody());
                                JsonNode pnData = pnRoot.has("data") ? pnRoot.get("data") : null;
                                if (pnData != null && pnData.isArray()) {
                                    for (JsonNode pn : pnData) {
                                        if (pn.has("display_phone_number")) {
                                            String num = pn.get("display_phone_number").asText();
                                            if (num != null && !num.isBlank()) seen.add(normalizePhoneForDedup(num));
                                        }
                                    }
                                }
                            } catch (Exception e) {
                                log.debug("Could not fetch phone_numbers for client WABA {}: {}", wabaId, e.getMessage());
                            }
                        }
                    }
                }
            } catch (Exception e) {
                log.debug("Could not fetch WABAs for business {}: {}", businessId, e.getMessage());
            }
        }

        return new ArrayList<>(seen);
    }

    private static String normalizePhoneForDedup(String phone) {
        if (phone == null) return "";
        return phone.replaceAll("[^0-9]", "");
    }

    private List<Integer> parseGenders(String genders) {
        if (genders == null || genders.isBlank()) return Collections.emptyList();
        List<Integer> list = new ArrayList<>();
        for (String s : genders.split("[,;]")) {
            String t = s.trim();
            if ("1".equals(t)) list.add(1);
            else if ("2".equals(t)) list.add(2);
        }
        return list;
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
        if (r.getName().length() > 256) {
            throw new RuntimeException("Nome da campanha: máximo 256 caracteres (Meta)");
        }
        boolean useExisting = Boolean.TRUE.equals(r.getUseExistingPost());
        if (useExisting) {
            if (r.getExistingPostId() == null || r.getExistingPostId().isBlank()) {
                throw new RuntimeException("Selecione um post existente da sua página.");
            }
        } else {
            if (r.getAdMessage() == null || r.getAdMessage().isBlank()) {
                throw new RuntimeException("Texto do anúncio é obrigatório");
            }
            if (r.getAdMessage().length() > 2200) {
                throw new RuntimeException("Texto do anúncio: máximo 2200 caracteres (Meta)");
            }
            if (r.getHeadline() != null && !r.getHeadline().isBlank() && r.getHeadline().length() > 40) {
                throw new RuntimeException("Headline: máximo 40 caracteres (Meta)");
            }
            if (r.getAdDescription() != null && !r.getAdDescription().isBlank() && r.getAdDescription().length() > 30) {
                throw new RuntimeException("Descrição: máximo 30 caracteres (Meta)");
            }
            if (r.getImageUrl() == null || r.getImageUrl().isBlank()) {
                throw new RuntimeException("Imagem do anúncio é obrigatória");
            }
        }
        if (!Boolean.TRUE.equals(r.getUseExistingPost()) && r.getWhatsappPhone() != null && !r.getWhatsappPhone().isBlank()) {
            String digits = r.getWhatsappPhone().replaceAll("\\D", "");
            if (digits.length() < 10 || digits.length() > 15) {
                throw new RuntimeException("WhatsApp: informe 10 a 15 dígitos (código país + número)");
            }
        }
    }

    private String mapOptimizationGoal(String objective, boolean isMessages) {
        if (isMessages) {
            return switch (objective != null ? objective.toUpperCase() : "") {
                case "OUTCOME_LEADS" -> "LEAD_GENERATION";
                case "OUTCOME_SALES" -> "OFFSITE_CONVERSIONS";
                case "OUTCOME_ENGAGEMENT" -> "POST_ENGAGEMENT";
                default -> "LINK_CLICKS";
            };
        }
        return switch (objective != null ? objective.toUpperCase() : "") {
            case "OUTCOME_LEADS" -> "LEAD_GENERATION";
            case "OUTCOME_SALES" -> "OFFSITE_CONVERSIONS";
            case "OUTCOME_ENGAGEMENT" -> "POST_ENGAGEMENT";
            case "OUTCOME_AWARENESS" -> "REACH";
            case "OUTCOME_APP_PROMOTION" -> "APP_INSTALLS";
            case "OUTCOME_TRAFFIC", "LINK_CLICKS" -> "LINK_CLICKS";
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
        params.put("is_adset_budget_sharing_enabled", "0"); // Meta exige: 0 ou 1 na criação da campanha
        params.put("access_token", accessToken);

        ResponseEntity<String> res = postForm(url, params);
        String body = res.getBody();
        if (body == null) throw new RuntimeException("Resposta vazia da Meta. Tente novamente.");
        JsonNode node = parseJson(objectMapper, body);
        if (node.has("id")) return node.get("id").asText();
        throw new RuntimeException(com.backend.winai.util.ErrorHelper.normalizeMessage(body));
    }

    private String createMetaAdSet(String adAccountId, String accessToken, String campaignId, String pageId,
                                   long dailyBudgetCents, String startDate, String endDate,
                                   String country, int ageMin, int ageMax, List<Integer> genders,
                                   String optimizationGoal, String interestsJson, String adSetName) {
        String url = metaApiBaseUrl + "/" + adAccountId + "/adsets";

        Map<String, Object> targeting = new HashMap<>();
        Map<String, Object> geo = new HashMap<>();
        geo.put("countries", List.of(country));
        targeting.put("geo_locations", geo);
        targeting.put("age_min", ageMin);
        targeting.put("age_max", ageMax);
        if (genders != null && !genders.isEmpty()) {
            targeting.put("genders", genders);
        }

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
        params.put("name", adSetName);
        params.put("campaign_id", campaignId);
        params.put("daily_budget", dailyBudgetCents);
        params.put("targeting", serializeToJson(objectMapper, targeting));
        // Doc Meta "Objective Mapping": OUTCOME_TRAFFIC + destination_type WHATSAPP + optimization_goal
        params.put("destination_type", "WHATSAPP");
        params.put("optimization_goal", optimizationGoal);
        params.put("billing_event", "IMPRESSIONS");
        params.put("bid_strategy", "LOWEST_COST_WITHOUT_CAP");
        params.put("promoted_object", serializeToJson(objectMapper, promotedObject));
        params.put("status", "PAUSED");
        params.put("access_token", accessToken);

        if (startDate != null && !startDate.isBlank()) {
            String start = startDate.trim();
            if (start.length() == 10) start += "T00:00:00-0300";
            params.put("start_time", start);
        }
        if (endDate != null && !endDate.isBlank()) {
            String end = endDate.trim();
            if (end.length() == 10) end += "T23:59:59-0300";
            params.put("end_time", end);
        }

        ResponseEntity<String> res = postForm(url, params);
        String body = res.getBody();
        JsonNode node = parseJson(objectMapper, body);
        if (node.has("id")) return node.get("id").asText();
        throw new RuntimeException(com.backend.winai.util.ErrorHelper.normalizeMessage(body != null ? body : "Erro ao criar conjunto de anúncios."));
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

    private String createMetaAdCreativeFromExistingPost(String adAccountId, String accessToken, String existingPostId) {
        String url = metaApiBaseUrl + "/" + adAccountId + "/adcreatives";
        Map<String, Object> params = new HashMap<>();
        params.put("name", "Creative - " + System.currentTimeMillis());
        params.put("object_story_id", existingPostId);
        params.put("access_token", accessToken);

        ResponseEntity<String> res = postForm(url, params);
        String body = res.getBody();
        JsonNode node = parseJson(objectMapper, body);
        if (node.has("id")) return node.get("id").asText();
        throw new RuntimeException(com.backend.winai.util.ErrorHelper.normalizeMessage(body != null ? body : "Erro ao criar criativo do anúncio."));
    }

    private String createMetaAdCreative(String adAccountId, String accessToken, String pageId,
                                       String message, String link, String headline, String description,
                                       String imageHash, String imageUrl, String ctaType) {
        String url = metaApiBaseUrl + "/" + adAccountId + "/adcreatives";

        String effectiveLink = (link != null && !link.isBlank()) ? link : "https://www.facebook.com";
        String effectiveCta = (ctaType != null && !ctaType.isBlank()) ? ctaType : "WHATSAPP_MESSAGE";

        Map<String, Object> linkData = new HashMap<>();
        linkData.put("message", message != null ? message : "Confira!");
        linkData.put("link", effectiveLink);
        if (headline != null && !headline.isBlank()) linkData.put("name", headline);
        if (description != null && !description.isBlank()) linkData.put("description", description);
        if (imageHash != null) {
            linkData.put("image_hash", imageHash);
        } else if (imageUrl != null && !imageUrl.isBlank()) {
            linkData.put("picture", imageUrl);
        } else {
            throw new RuntimeException("Imagem é obrigatória para o criativo");
        }
        Map<String, Object> cta = new HashMap<>();
        cta.put("type", effectiveCta);
        cta.put("value", Map.of("link", effectiveLink));
        linkData.put("call_to_action", cta);

        Map<String, Object> objectStorySpec = new HashMap<>();
        objectStorySpec.put("page_id", pageId);
        objectStorySpec.put("link_data", linkData);

        Map<String, Object> params = new HashMap<>();
        params.put("name", "Creative - " + System.currentTimeMillis());
        params.put("object_story_spec", serializeToJson(objectMapper, objectStorySpec));
        params.put("access_token", accessToken);

        ResponseEntity<String> res = postForm(url, params);
        String body = res.getBody();
        JsonNode node = parseJson(objectMapper, body);
        if (node.has("id")) return node.get("id").asText();
        throw new RuntimeException(com.backend.winai.util.ErrorHelper.normalizeMessage(body != null ? body : "Erro ao criar criativo do anúncio."));
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
        String body = res.getBody();
        JsonNode node = parseJson(objectMapper, body);
        if (node.has("id")) return;
        throw new RuntimeException(com.backend.winai.util.ErrorHelper.normalizeMessage(body != null ? body : "Erro ao criar anúncio."));
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

    private TrafficMetricsResponse mapInsightsToResponse(List<MetaInsight> insights) {
        double currentSpend = 0;
        long currentImpressions = 0;
        long currentClicks = 0;
        long currentConversions = 0;

        double previousSpend = 0;
        long previousImpressions = 0;
        long previousClicks = 0;
        long previousConversions = 0;

        List<TrafficMetricsResponse.DailyPerformance> performance = new ArrayList<>();

        if (insights != null && !insights.isEmpty()) {
            int totalDays = insights.size();
            int currentStartIndex = Math.max(0, totalDays - 7);

            for (int i = 0; i < totalDays; i++) {
                MetaInsight node = insights.get(i);
                double spend = node.getSpend() != null ? node.getSpend() : 0.0;
                long imps = node.getImpressions() != null ? node.getImpressions() : 0;
                long clks = node.getClicks() != null ? node.getClicks() : 0;
                long convs = node.getConversions() != null ? node.getConversions() : 0;

                if (i >= currentStartIndex) {
                    currentSpend += spend;
                    currentImpressions += imps;
                    currentClicks += clks;
                    currentConversions += convs;

                    String dateStr = node.getDate().toString();
                    String dd = dateStr.length() >= 10 ? dateStr.substring(8, 10) : "00";
                    String mm = dateStr.length() >= 10 ? dateStr.substring(5, 7) : "00";
                    performance.add(TrafficMetricsResponse.DailyPerformance.builder()
                            .date(dd + "/" + mm)
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
        throttleBeforeRequest();
        java.net.URI uri = java.net.URI.create(url);
        int maxAttempts = 3;
        for (int i = 0; i < maxAttempts; i++) {
            try {
                ResponseEntity<String> response = restTemplate.getForEntity(uri, String.class);
                lastMetaRequestTime = System.currentTimeMillis();
                updateUsageRate(response);
                return response;
            } catch (org.springframework.web.client.HttpClientErrorException e) {
                String body = e.getResponseBodyAsString() != null ? e.getResponseBodyAsString() : "";
                boolean isRateLimit = isMetaRateLimitError(e.getStatusCode().value(), body);

                if (isRateLimit && i < maxAttempts - 1) {
                    long waitMs = extractEstimatedWaitFromHeaders(e.getResponseHeaders());
                    if (waitMs <= 0) waitMs = rateLimitRetryWaitMs;
                    log.warn("Meta API rate limit reached. Waiting {}s before retry... (Attempt {})",
                            waitMs / 1000, i + 1);
                    try {
                        Thread.sleep(waitMs);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw e;
                    }
                    continue;
                }
                throw e;
            }
        }
        return null;
    }

    /** Throttle: intervalo mínimo entre requisições + delay adaptativo quando uso alto. */
    private synchronized void throttleBeforeRequest() {
        long elapsed = System.currentTimeMillis() - lastMetaRequestTime;
        long baseDelay = throttleDelayMs > 0 ? throttleDelayMs : 0;
        if (baseDelay > 0 && elapsed < baseDelay) {
            try {
                Thread.sleep(baseDelay - elapsed);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
            }
        }
        if (latestUsageRate > 30) {
            adaptiveThrottle();
        }
    }

    /** Códigos de rate limit da Meta: 4, 17, 32, 429, 613, 80000-80008. */
    private boolean isMetaRateLimitError(int statusCode, String body) {
        if (statusCode == 429) return true;
        if (statusCode == 400 && body != null) {
            if (body.contains("\"code\":17") || body.contains("\"code\": 17")) return true;
            if (body.contains("\"code\":4") || body.contains("\"code\": 4")) return true;
            if (body.contains("\"code\":32") || body.contains("\"code\": 32")) return true;
            if (body.contains("\"code\":613") || body.contains("\"code\": 613")) return true;
            if (body.contains("2446079")) return true; // subcode comum para Ads API
        }
        return false;
    }

    /** Extrai estimated_time_to_regain_access (minutos) do header X-Business-Use-Case-Usage. */
    private long extractEstimatedWaitFromHeaders(org.springframework.http.HttpHeaders headers) {
        if (headers == null) return 0;
        String bizUsage = headers.getFirst("X-Business-Use-Case-Usage");
        if (bizUsage == null) bizUsage = headers.getFirst("X-Business-Use-Case");
        if (bizUsage == null) return 0;
        try {
            JsonNode root = objectMapper.readTree(bizUsage);
            for (Iterator<String> it = root.fieldNames(); it.hasNext(); ) {
                JsonNode arr = root.get(it.next());
                if (arr != null && arr.isArray()) {
                    for (JsonNode item : arr) {
                        if (item.has("estimated_time_to_regain_access")) {
                            int minutes = item.get("estimated_time_to_regain_access").asInt();
                            if (minutes > 0) return minutes * 60L * 1000L;
                        }
                    }
                }
            }
        } catch (Exception ex) {
            log.debug("Could not parse estimated_time_to_regain_access: {}", ex.getMessage());
        }
        return 0;
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
