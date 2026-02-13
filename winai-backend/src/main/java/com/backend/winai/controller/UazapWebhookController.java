package com.backend.winai.controller;

import com.backend.winai.dto.webhook.UazapWebhookPayload;
import com.backend.winai.service.UazapWebhookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/v1/webhooks/uazap")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Webhooks", description = "Endpoints para receber webhooks do UaZap")
public class UazapWebhookController {

    private final UazapWebhookService webhookService;

    @Operation(summary = "Webhook UaZap", description = "Recebe notificações de mensagens do UaZap")
    @PostMapping("/message")
    public ResponseEntity<Void> receiveMessage(@RequestBody UazapWebhookPayload payload, HttpServletRequest request) {
        try {
            log.info("[UAZAP-WEBHOOK] POST /message recebido de IP: {}, Event: {}, Instance: {}",
                    request.getRemoteAddr(), payload.getEvent(), payload.getInstance());
            log.info("[UAZAP-WEBHOOK] Payload data: fromMe={}, sender={}, text={}",
                    payload.getData() != null ? payload.getData().getFromMe() : null,
                    payload.getData() != null ? payload.getData().getSender() : null,
                    payload.getData() != null ? (payload.getData().getText() != null ? payload.getData().getText().substring(0, Math.min(50, payload.getData().getText().length())) : null) : null);

            webhookService.processWebhook(payload);

            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("[UAZAP-WEBHOOK] Erro ao processar webhook do UaZap", e);
            return ResponseEntity.ok().build();
        }
    }

    @Operation(summary = "Webhook UaZap (Genérico)", description = "Endpoint genérico para todos os eventos do UaZap")
    @PostMapping
    public ResponseEntity<Void> receiveWebhook(@RequestBody UazapWebhookPayload payload, HttpServletRequest request) {
        log.info("[UAZAP-WEBHOOK] POST / (genérico) recebido de IP: {}", request.getRemoteAddr());
        return receiveMessage(payload, request);
    }

    @Operation(summary = "Health Check", description = "Verifica se o webhook está funcionando")
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        log.info("[UAZAP-WEBHOOK] GET /health chamado");
        return ResponseEntity.ok("Webhook UaZap está funcionando!");
    }

    @GetMapping
    public ResponseEntity<String> healthRoot() {
        log.info("[UAZAP-WEBHOOK] GET / chamado");
        return ResponseEntity.ok("Webhook UaZap endpoint ativo");
    }
}
