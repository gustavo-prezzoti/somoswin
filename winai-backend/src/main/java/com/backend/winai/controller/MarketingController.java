package com.backend.winai.controller;

import com.backend.winai.dto.marketing.AiRecommendationDTO;
import com.backend.winai.dto.marketing.CampaignsListResponse;
import com.backend.winai.dto.marketing.CreateCampaignRequest;
import com.backend.winai.dto.marketing.InstagramMetricsResponse;
import com.backend.winai.dto.marketing.TrafficMetricsResponse;
import com.backend.winai.entity.User;
import com.backend.winai.service.MarketingAiRecommendationsService;
import com.backend.winai.service.MarketingService;
import lombok.RequiredArgsConstructor;
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
public class MarketingController {

    private final MarketingService marketingService;
    private final MarketingAiRecommendationsService aiRecommendationsService;

    @GetMapping("/metrics")
    public ResponseEntity<TrafficMetricsResponse> getMetrics(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(marketingService.getTrafficMetrics(user));
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
        String url = marketingService.getMetaAuthorizationUrl(user);
        return ResponseEntity.ok(Map.of("url", url));
    }

    @GetMapping("/auth/meta/callback")
    public ResponseEntity<Void> handleMetaCallback(
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "state", required = false) String companyId,
            @RequestParam(value = "error", required = false) String error,
            @RequestParam(value = "error_reason", required = false) String errorReason) {

        // Handle user cancellation or permission denial
        if (error != null || code == null) {
            String errorMessage = errorReason != null ? errorReason : (error != null ? error : "unknown_error");
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
