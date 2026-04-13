package com.backend.winai.controller;

import com.backend.winai.dto.whatsapp.broadcast.ActiveBaseDashboardMetricsResponse;
import com.backend.winai.dto.whatsapp.broadcast.CreateWhatsAppBroadcastRequest;
import com.backend.winai.dto.whatsapp.broadcast.WhatsAppBroadcastCampaignResponse;
import com.backend.winai.entity.User;
import com.backend.winai.service.WhatsAppBroadcastService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/whatsapp/broadcasts")
@RequiredArgsConstructor
public class WhatsAppBroadcastController {

    private final WhatsAppBroadcastService broadcastService;

    @GetMapping("/metrics")
    public ResponseEntity<ActiveBaseDashboardMetricsResponse> metrics(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(broadcastService.dashboardMetrics(user));
    }

    @GetMapping
    public ResponseEntity<Page<WhatsAppBroadcastCampaignResponse>> list(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        return ResponseEntity.ok(broadcastService.list(user, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<WhatsAppBroadcastCampaignResponse> get(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        return ResponseEntity.ok(broadcastService.get(user, id));
    }

    @PostMapping
    public ResponseEntity<WhatsAppBroadcastCampaignResponse> create(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateWhatsAppBroadcastRequest request) {
        return ResponseEntity.ok(broadcastService.createAndOptionallyStart(user, request, null));
    }

    /**
     * Mesmo fluxo de criação com arquivo CSV/XLSX (parte "contactsFile"). Parte "request" deve ser JSON
     * (Content-Type application/json).
     */
    @PostMapping(value = "/with-file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<WhatsAppBroadcastCampaignResponse> createWithFile(
            @AuthenticationPrincipal User user,
            @Valid @RequestPart("request") CreateWhatsAppBroadcastRequest request,
            @RequestPart(value = "contactsFile", required = false) MultipartFile contactsFile) throws IOException {
        List<String> extra = null;
        if (contactsFile != null && !contactsFile.isEmpty()) {
            extra = broadcastService.parseContactsFile(contactsFile.getBytes(), contactsFile.getOriginalFilename());
        }
        return ResponseEntity.ok(broadcastService.createAndOptionallyStart(user, request, extra));
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<Void> start(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        broadcastService.startCampaign(user, id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<Void> cancel(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        broadcastService.cancelCampaign(user, id);
        return ResponseEntity.ok().build();
    }
}
