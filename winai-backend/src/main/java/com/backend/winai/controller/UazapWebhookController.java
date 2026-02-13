package com.backend.winai.controller;

import com.backend.winai.dto.request.UazapWebhookRequest;
import com.backend.winai.service.WhatsAppWebhookService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.DeserializationFeature;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/webhooks/uazap")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Webhooks", description = "Endpoints para receber webhooks do UaZap")
public class UazapWebhookController {

    private final WhatsAppWebhookService whatsAppWebhookService;

    private static final ObjectMapper mapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    @Operation(summary = "Webhook UaZap", description = "Recebe notificações de mensagens do UaZap")
    @PostMapping("/message")
    public ResponseEntity<Void> receiveMessage(@RequestBody Map<String, Object> rawPayload, HttpServletRequest request) {
        try {
            log.info("[UAZAP-WEBHOOK] POST /message recebido de IP: {}", request.getRemoteAddr());

            String eventType = rawPayload.get("EventType") != null ? String.valueOf(rawPayload.get("EventType")) : null;
            String instanceName = rawPayload.get("instanceName") != null ? String.valueOf(rawPayload.get("instanceName")) : null;

            log.info("[UAZAP-WEBHOOK] EventType: {}, Instance: {}", eventType, instanceName);

            // Ignorar eventos que não são mensagens novas
            if (eventType != null && !eventType.equalsIgnoreCase("messages")) {
                log.debug("[UAZAP-WEBHOOK] Evento não é mensagem ({}). Ignorando.", eventType);
                return ResponseEntity.ok().build();
            }

            // Converter Map raw para UazapWebhookRequest e processar no serviço completo
            UazapWebhookRequest webhookRequest = mapper.convertValue(rawPayload, UazapWebhookRequest.class);
            whatsAppWebhookService.processWebhook(webhookRequest);

            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("[UAZAP-WEBHOOK] Erro ao processar webhook do UaZap", e);
            return ResponseEntity.ok().build();
        }
    }

    @Operation(summary = "Webhook UaZap (Genérico)", description = "Endpoint genérico para todos os eventos do UaZap")
    @PostMapping
    public ResponseEntity<Void> receiveWebhook(@RequestBody Map<String, Object> rawPayload, HttpServletRequest request) {
        log.info("[UAZAP-WEBHOOK] POST / (genérico) recebido de IP: {}", request.getRemoteAddr());
        return receiveMessage(rawPayload, request);
    }

    @Operation(summary = "Webhook UaZap (Path variável)", description = "Captura webhooks com path dinâmico do UaZap (addUrlEvents)")
    @PostMapping("/{eventType}")
    public ResponseEntity<Void> receiveWebhookByEvent(@PathVariable String eventType, @RequestBody Map<String, Object> rawPayload, HttpServletRequest request) {
        log.info("[UAZAP-WEBHOOK] POST /{} recebido de IP: {}", eventType, request.getRemoteAddr());
        return receiveMessage(rawPayload, request);
    }

    @Operation(summary = "Health Check", description = "Verifica se o webhook está funcionando")
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Webhook UaZap está funcionando!");
    }

    @GetMapping
    public ResponseEntity<String> healthRoot() {
        return ResponseEntity.ok("Webhook UaZap endpoint ativo");
    }
}
