package com.backend.winai.controller;

import com.backend.winai.dto.marketing.AiRecommendationDTO;
import com.backend.winai.dto.marketing.CampaignsListResponse;
import com.backend.winai.dto.marketing.CreateCampaignRequest;
import com.backend.winai.dto.marketing.InstagramMetricsResponse;
import com.backend.winai.dto.marketing.TrafficMetricsResponse;
import com.backend.winai.entity.User;
import com.backend.winai.service.MarketingAiRecommendationsService;
import com.backend.winai.service.MarketingService;
import com.backend.winai.service.MetaSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/marketing")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class MarketingController {

    private final MarketingService marketingService;
    private final MarketingAiRecommendationsService aiRecommendationsService;
    private final MetaSyncService metaSyncService;

    @GetMapping("/metrics")
    public ResponseEntity<TrafficMetricsResponse> getMetrics(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String campaignId,
            @RequestParam(required = false) java.time.LocalDate startDate,
            @RequestParam(required = false) java.time.LocalDate endDate) {
        return ResponseEntity.ok(marketingService.getTrafficMetrics(user, campaignId, startDate, endDate));
    }

    @GetMapping("/metrics/date-range")
    public ResponseEntity<java.util.Map<String, String>> getMetricsDateRange(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(marketingService.getTrafficMetricsDateRange(user));
    }

    @GetMapping("/instagram-metrics")
    public ResponseEntity<InstagramMetricsResponse> getInstagramMetrics(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(marketingService.getInstagramMetrics(user));
    }

    @PostMapping("/campaigns")
    public ResponseEntity<Void> createCampaign(@AuthenticationPrincipal User user, @RequestBody CreateCampaignRequest request) {
        marketingService.createCampaign(user, request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/auth/meta")
    public ResponseEntity<Map<String, String>> getMetaAuthUrl(@AuthenticationPrincipal User user) {
        var result = marketingService.getMetaAuthorizationUrlWithMode(user);
        log.info("[MetaAuth] company={} mode={} url={}", user.getCompany().getId(), result.get("mode"), result.get("url"));
        return ResponseEntity.ok(result);
    }

    @GetMapping("/auth/meta/callback")
    public ResponseEntity<Void> handleMetaCallback(
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "state", required = false) String companyId,
            @RequestParam(value = "error", required = false) String error,
            @RequestParam(value = "error_reason", required = false) String errorReason,
            @RequestParam(value = "error_description", required = false) String errorDescription) {

        log.info("[MetaCallback] Recebido: code={} state={} error={} error_reason={} error_description={}",
                code != null ? "present" : "null", companyId, error, errorReason, errorDescription);

        // Handle user cancellation or permission denial
        if (error != null || code == null) {
            String errorMessage = errorReason != null ? errorReason : (error != null ? error : "unknown_error");
            log.warn("[MetaCallback] Falha OAuth - redirecionando com error=meta_{}. Detalhe: {}", 
                    errorMessage, errorDescription != null ? errorDescription : error);
            String frontendUrl = marketingService.getFrontendUrl();
            return ResponseEntity.status(302)
                    .header("Location", frontendUrl + "/configuracoes?error=meta_" + errorMessage)
                    .build();
        }

        String redirectUrl = marketingService.handleMetaCallback(code, companyId);
        return ResponseEntity.status(302).header("Location", redirectUrl).build();
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getMetaStatus(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(marketingService.getMetaConnectionStatus(user));
    }

    @GetMapping("/details")
    public ResponseEntity<Map<String, Object>> getMetaDetails(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(marketingService.getMetaConnectionDetails(user));
    }

    @GetMapping("/campaigns")
    public ResponseEntity<CampaignsListResponse> getCampaigns(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(marketingService.getCampaignsForUser(user));
    }

    @PostMapping("/sync")
    public ResponseEntity<Map<String, String>> triggerSync(@AuthenticationPrincipal User user) {
        metaSyncService.syncForCompany(user.getCompany().getId());
        return ResponseEntity.ok(Map.of("status", "sync_started", "message", "Sincronização iniciada em background"));
    }

    @PatchMapping("/campaigns/{campaignId}/status")
    public ResponseEntity<Void> updateCampaignStatus(
            @AuthenticationPrincipal User user,
            @PathVariable String campaignId,
            @RequestParam String status) {
        marketingService.updateCampaignStatus(user, campaignId, status);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/campaigns/{campaignId}/budget")
    public ResponseEntity<Void> increaseCampaignBudget(
            @AuthenticationPrincipal User user,
            @PathVariable String campaignId,
            @RequestParam(defaultValue = "20") int percent) {
        marketingService.increaseCampaignBudget(user, campaignId, percent);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/ai-recommendations")
    public ResponseEntity<java.util.List<AiRecommendationDTO>> getAiRecommendations(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(aiRecommendationsService.getRecommendations(user));
    }

    @GetMapping("/targeting-search")
    public ResponseEntity<List<Map<String, Object>>> searchTargeting(
            @AuthenticationPrincipal User user,
            @RequestParam String q,
            @RequestParam(defaultValue = "adinterest") String type) {
        return ResponseEntity.ok(marketingService.searchTargeting(user, q, type));
    }

    @PostMapping(value = "/upload-image", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadCampaignImage(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file) {
        try {
            return ResponseEntity.ok(marketingService.uploadCampaignImage(user, file));
        } catch (java.io.IOException e) {
            throw new RuntimeException("Erro ao enviar imagem: " + e.getMessage());
        }
    }

    @PostMapping("/ai-recommendations/apply")
    public ResponseEntity<Void> applyAiRecommendation(
            @AuthenticationPrincipal User user,
            @RequestBody AiRecommendationDTO recommendation) {
        aiRecommendationsService.applyRecommendation(user, recommendation);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/ai-recommendations/regenerate")
    public ResponseEntity<Void> regenerateAiRecommendations(@AuthenticationPrincipal User user) {
        aiRecommendationsService.regenerateRecommendations(user);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/disconnect")
    public ResponseEntity<Void> disconnectMeta(@AuthenticationPrincipal User user) {
        marketingService.disconnectMeta(user);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/auth/meta/deauthorize")
    public ResponseEntity<Void> handleMetaDeauthorize(@RequestParam("signed_request") String signedRequest) {
        marketingService.handleMetaDeauthorize(signedRequest);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/auth/meta/data-deletion")
    public ResponseEntity<Map<String, String>> handleMetaDataDeletion(
            @RequestParam("signed_request") String signedRequest) {
        return ResponseEntity.ok(marketingService.handleMetaDataDeletion(signedRequest));
    }
}
