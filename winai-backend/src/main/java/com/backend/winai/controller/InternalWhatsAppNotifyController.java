package com.backend.winai.controller;

import com.backend.winai.service.WhatsAppNotifyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * Endpoint interno para o follow-up worker notificar o backend a enviar WebSocket
 * (mensagem foi persistida no worker; o frontend está conectado ao backend).
 */
@RestController
@RequestMapping("/api/internal/whatsapp")
@RequiredArgsConstructor
@Slf4j
public class InternalWhatsAppNotifyController {

    private final WhatsAppNotifyService whatsAppNotifyService;

    @Value("${internal.api.key:winai-lq-f8a9b2c7e4d1-2026-xK9mN3pL}")
    private String internalApiKey;

    @PostMapping("/notify-new-message")
    public ResponseEntity<?> notifyNewMessage(
            @RequestHeader("X-Internal-Key") String apiKey,
            @RequestBody Map<String, String> body) {
        if (!internalApiKey.equals(apiKey)) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid API key"));
        }
        String convIdStr = body.get("conversationId");
        String companyIdStr = body.get("companyId");
        if (convIdStr == null || companyIdStr == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "conversationId and companyId required"));
        }
        try {
            UUID conversationId = UUID.fromString(convIdStr);
            UUID companyId = UUID.fromString(companyIdStr);
            whatsAppNotifyService.broadcastNewMessageForConversation(conversationId, companyId);
            return ResponseEntity.ok(Map.of("ok", true));
        } catch (Exception e) {
            log.warn("notify-new-message failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Persiste a mensagem no banco e envia WebSocket (para o follow-up worker usar após enviar no Uazap).
     */
    @PostMapping("/persist-and-notify-message")
    public ResponseEntity<?> persistAndNotifyMessage(
            @RequestHeader("X-Internal-Key") String apiKey,
            @RequestBody Map<String, String> body) {
        if (!internalApiKey.equals(apiKey)) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid API key"));
        }
        String convIdStr = body.get("conversationId");
        String companyIdStr = body.get("companyId");
        String content = body.get("content");
        if (convIdStr == null || companyIdStr == null || content == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "conversationId, companyId and content required"));
        }
        try {
            UUID conversationId = UUID.fromString(convIdStr);
            UUID companyId = UUID.fromString(companyIdStr);
            whatsAppNotifyService.persistAndNotifyMessage(conversationId, companyId, content);
            return ResponseEntity.ok(Map.of("ok", true));
        } catch (Exception e) {
            log.warn("persist-and-notify-message failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
