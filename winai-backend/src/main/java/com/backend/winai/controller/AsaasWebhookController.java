package com.backend.winai.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller para receber webhooks do Asaas (gateway de pagamento).
 * URL configurada: https://server.somosamplia.com/api/v1/asaas/webhook
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/asaas")
@RequiredArgsConstructor
public class AsaasWebhookController {

    /**
     * Endpoint para receber eventos do Asaas (PAYMENT_RECEIVED, PAYMENT_CONFIRMED, etc.)
     */
    @PostMapping("/webhook")
    public ResponseEntity<Map<String, String>> receiveWebhook(@RequestBody Map<String, Object> payload) {
        try {
            String event = (String) payload.get("event");
            Object eventId = payload.get("id");
            log.info("Webhook Asaas recebido - Event: {}, Id: {}", event, eventId);

            if (event != null) {
                switch (event) {
                    case "PAYMENT_RECEIVED":
                    case "PAYMENT_CONFIRMED":
                        log.info("Pagamento confirmado/recebido: {}", payload.get("payment"));
                        break;
                    case "PAYMENT_CREATED":
                        log.info("Pagamento criado: {}", payload.get("payment"));
                        break;
                    case "PAYMENT_OVERDUE":
                        log.warn("Pagamento vencido: {}", payload.get("payment"));
                        break;
                    case "PAYMENT_REFUNDED":
                        log.info("Pagamento estornado: {}", payload.get("payment"));
                        break;
                    default:
                        log.debug("Evento Asaas: {} - payload: {}", event, payload);
                }
            }

            return ResponseEntity.ok(Map.of("received", "true"));
        } catch (Exception e) {
            log.error("Erro ao processar webhook Asaas", e);
            return ResponseEntity.ok(Map.of("received", "true", "error", e.getMessage()));
        }
    }
}
