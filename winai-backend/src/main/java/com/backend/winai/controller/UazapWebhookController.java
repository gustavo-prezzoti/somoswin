package com.backend.winai.controller;

import com.backend.winai.dto.webhook.UazapWebhookPayload;
import com.backend.winai.service.UazapWebhookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/webhooks/uazap")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Webhooks", description = "Endpoints para receber webhooks do UaZap")
public class UazapWebhookController {

    private final UazapWebhookService webhookService;

    @Operation(summary = "Webhook UaZap", description = "Recebe notificações de mensagens do UaZap")
    @PostMapping("/message")
    public ResponseEntity<Void> receiveMessage(@RequestBody UazapWebhookPayload payload) {
        try {
            log.info("Webhook recebido do UaZap. Event: {}, Instance: {}",
                    payload.getEvent(), payload.getInstance());

            webhookService.processWebhook(payload);

            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Erro ao processar webhook do UaZap", e);
            // Retornar 200 mesmo com erro para não fazer o UaZap reenviar
            return ResponseEntity.ok().build();
        }
    }

    @Operation(summary = "Webhook UaZap (Genérico)", description = "Endpoint genérico para todos os eventos do UaZap")
    @PostMapping
    public ResponseEntity<Void> receiveWebhook(@RequestBody UazapWebhookPayload payload) {
        return receiveMessage(payload);
    }

    @Operation(summary = "Health Check", description = "Verifica se o webhook está funcionando")
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Webhook UaZap está funcionando!");
    }
}
