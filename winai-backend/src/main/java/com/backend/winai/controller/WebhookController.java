package com.backend.winai.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.HashMap;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@Slf4j
@RestController
@RequestMapping("/api/v1/webhook")
@RequiredArgsConstructor
public class WebhookController {

    private final com.backend.winai.service.WhatsAppWebhookService whatsAppWebhookService;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Endpoint para receber webhooks do WhatsApp (Evolution API / UaZap)
     * Este endpoint recebe eventos de mensagens, status e presença
     */
    @PostMapping("/whatsapp")
    public ResponseEntity<Map<String, String>> receiveWhatsAppWebhook(
            @RequestBody Map<String, Object> payload,
            @RequestHeader(value = "apikey", required = false) String apikey) {
        try {
            log.info("Webhook recebido (Payload RAW): {}", payload);

            // Tenta obter o tipo de evento de 'EventType', 'event' ou 'type'
            String eventType = (String) payload.get("EventType");
            if (eventType == null) {
                eventType = (String) payload.get("event");
            }
            if (eventType == null) {
                eventType = (String) payload.get("type");
            }

            // Tenta obter a instância de 'instanceName' ou 'instance'
            String instance = (String) payload.get("instanceName");
            if (instance == null) {
                instance = (String) payload.get("instance");
            }

            log.info("Evento processado: {}, Instância: {}", eventType, instance);

            if (eventType == null) {
                log.warn("Evento desconhecido ou nulo recebido: {}", payload);
                return ResponseEntity.ok(Map.of("status", "ignored", "reason", "event_type_null"));
            }

            // Converter o Map para o objeto de evento se necessário ou processar
            // diretamente
            // Para manter a compatibilidade com os métodos existentes, vamos criar o objeto
            // manualmente
            // ou adaptar os métodos para receber o Map.
            // Vamos adaptar os métodos para receber o Map para ser mais flexível.

            processEvent(eventType, instance, payload);

            return ResponseEntity.ok(Map.of("status", "received"));
        } catch (Exception e) {
            log.error("Erro ao processar webhook", e);
            return ResponseEntity.ok(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    @SuppressWarnings("unchecked")
    private void processEvent(String eventType, String instance, Map<String, Object> payload) {
        Map<String, Object> data = (Map<String, Object>) payload.get("data");
        if (data == null) {
            data = payload;
        }

        switch (eventType) {
            case "messages.upsert":
            case "message":
            case "messages":
                handleMessageEvent(instance, data);
                break;
            case "messages.update":
            case "messages_update":
            case "status":
                handleStatusEvent(instance, data);
                break;
            case "presence.update":
            case "presence":
                handlePresenceEvent(instance, data);
                break;
            case "connection.update":
            case "connection":
                handleConnectionEvent(instance, payload);
                break;
            default:
                log.info("Evento não tratado: {}", eventType);
        }
    }

    /**
     * Processa eventos de mensagens (enviadas ou recebidas)
     */
    private void handleMessageEvent(String instance, Map<String, Object> data) {
        log.info("Processando mensagem - Instância: {}", instance);

        if (data != null) {
            try {
                // Converter Map para DTO
                com.backend.winai.dto.request.UazapWebhookRequest webhookRequest = objectMapper.convertValue(data,
                        com.backend.winai.dto.request.UazapWebhookRequest.class);

                // Se a instância não veio no payload, usar a que extraímos
                if (webhookRequest.getInstanceName() == null) {
                    webhookRequest.setInstanceName(instance);
                }

                log.info("Delegando processamento para o serviço de webhook (WhatsAppWebhookService)");
                whatsAppWebhookService.processWebhook(webhookRequest);

            } catch (Exception e) {
                log.error("Erro ao converter/processar mensagem do webhook", e);
            }
        }
    }

    /**
     * Processa eventos de status de mensagens
     */
    private void handleStatusEvent(String instance, Map<String, Object> data) {
        log.info("Processando status - Instância: {}", instance);

        if (data != null) {
            log.debug("Status atualizado: {}", data);

            // TODO: Implementar lógica de atualização de status
            // Exemplos:
            // - Atualizar status de entrega no banco
            // - Notificar sobre leitura de mensagem
        }
    }

    /**
     * Processa eventos de presença (online/offline)
     */
    private void handlePresenceEvent(String instance, Map<String, Object> data) {
        log.info("Processando presença - Instância: {}", instance);

        if (data != null) {
            log.debug("Presença atualizada: {}", data);

            // TODO: Implementar lógica de presença
            // Exemplos:
            // - Registrar quando contatos ficam online/offline
            // - Atualizar status de disponibilidade
        }
    }

    /**
     * Processa eventos de conexão (QR code, status de conexão)
     */
    @SuppressWarnings("unchecked")
    private void handleConnectionEvent(String instance, Map<String, Object> payload) {
        log.info("Processando evento de conexão - Instância: {}", instance);

        try {
            // Extrair dados da instância
            Map<String, Object> instanceData = (Map<String, Object>) payload.get("instance");
            if (instanceData == null) {
                instanceData = new HashMap<>();
            }

            String qrcode = (String) instanceData.get("qrcode");
            String status = (String) instanceData.get("status");
            String instanceName = instance;

            if (instanceName == null) {
                instanceName = (String) instanceData.get("name");
            }

            // Preparar mensagem para WebSocket
            Map<String, Object> wsMessage = new HashMap<>();
            wsMessage.put("type", "CONNECTION_UPDATE");
            wsMessage.put("instanceName", instanceName);
            wsMessage.put("status", status);

            if (qrcode != null && !qrcode.isEmpty()) {
                wsMessage.put("qrcode", qrcode);
                log.info("QR code recebido para instância {}. Enviando via WebSocket.", instanceName);
            }

            // Enviar para canal global de conexões WhatsApp
            messagingTemplate.convertAndSend("/topic/whatsapp/connection", (Object) wsMessage);

            // Também enviar para canal específico da instância
            if (instanceName != null) {
                messagingTemplate.convertAndSend("/topic/whatsapp/connection/" + instanceName, (Object) wsMessage);
            }

            log.info("Evento de conexão enviado via WebSocket: instance={}, status={}, hasQrCode={}",
                    instanceName, status, qrcode != null);

        } catch (Exception e) {
            log.error("Erro ao processar evento de conexão", e);
        }
    }

    /**
     * Endpoint de teste para verificar se o webhook está funcionando
     */
    @GetMapping("/test")
    public ResponseEntity<Map<String, String>> testWebhook() {
        return ResponseEntity.ok(Map.of(
                "status", "ok",
                "message", "Webhook endpoint está funcionando",
                "endpoint", "/api/v1/webhook/whatsapp"));
    }
}
