package com.backend.winai.controller;

import com.backend.winai.dto.request.SendWhatsAppMessageRequest;
import com.backend.winai.dto.request.UazapWebhookRequest;
import com.backend.winai.dto.response.SDRAgentStatusResponse;
import com.backend.winai.dto.response.WhatsAppConversationResponse;
import com.backend.winai.dto.response.WhatsAppMessageResponse;
import com.backend.winai.entity.User;
import com.backend.winai.service.WhatsAppService;
import com.backend.winai.service.WhatsAppWebhookService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/whatsapp")
@RequiredArgsConstructor
public class WhatsAppController {

    private final WhatsAppService whatsAppService;
    private final WhatsAppWebhookService webhookService;

    /**
     * POST /api/v1/whatsapp/send
     * Envia uma mensagem de texto via WhatsApp
     */
    @PostMapping("/send")
    public ResponseEntity<WhatsAppMessageResponse> sendMessage(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody SendWhatsAppMessageRequest request) {
        WhatsAppMessageResponse response = whatsAppService.sendMessage(request, user);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/v1/whatsapp/send-media
     * Envia uma mensagem de mídia (imagem, áudio, vídeo, documento) via WhatsApp
     */
    @PostMapping("/send-media")
    public ResponseEntity<WhatsAppMessageResponse> sendMediaMessage(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody com.backend.winai.dto.request.SendMediaMessageRequest request) {
        WhatsAppMessageResponse response = whatsAppService.sendMediaMessage(request, user);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/v1/whatsapp/conversations
     * Lista todas as conversas do usuário
     */
    @GetMapping("/conversations")
    public ResponseEntity<List<WhatsAppConversationResponse>> getConversations(
            @AuthenticationPrincipal User user) {
        List<WhatsAppConversationResponse> conversations = whatsAppService.getConversations(user);
        return ResponseEntity.ok(conversations);
    }

    /**
     * GET /api/v1/whatsapp/conversations/{id}/messages
     * Obtém mensagens de uma conversa
     */
    @GetMapping("/conversations/{id}/messages")
    public ResponseEntity<List<WhatsAppMessageResponse>> getMessages(
            @PathVariable UUID id,
            @RequestParam(required = false, defaultValue = "0") Integer page,
            @RequestParam(required = false, defaultValue = "20") Integer limit,
            @AuthenticationPrincipal User user) {
        List<WhatsAppMessageResponse> messages = whatsAppService.getMessages(id, user, page, limit);
        return ResponseEntity.ok(messages);
    }

    /**
     * PUT /api/v1/whatsapp/conversations/{id}/read
     * Marca conversa como lida
     */
    @PutMapping("/conversations/{id}/read")
    public ResponseEntity<Void> markAsRead(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        whatsAppService.markConversationAsRead(id, user);
        return ResponseEntity.ok().build();
    }

    /**
     * PUT /api/v1/whatsapp/conversations/{id}/archive
     * Arquiva/desarquiva uma conversa
     */
    @PutMapping("/conversations/{id}/archive")
    public ResponseEntity<WhatsAppConversationResponse> toggleArchive(
            @PathVariable UUID id,
            @RequestParam(required = false) Boolean archive,
            @AuthenticationPrincipal User user) {
        WhatsAppConversationResponse response = whatsAppService.toggleArchive(id, user, archive);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/v1/whatsapp/unread/count
     * Conta conversas não lidas
     */
    @GetMapping("/unread/count")
    public ResponseEntity<Long> getUnreadCount(@AuthenticationPrincipal User user) {
        Long count = whatsAppService.getUnreadCount(user);
        return ResponseEntity.ok(count);
    }

    /**
     * POST /api/v1/whatsapp/webhook
     * Endpoint para receber webhooks do n8n/Uazap
     * Processa mensagens recebidas, cria/atualiza leads e conversas
     */
    @PostMapping("/webhook")
    public ResponseEntity<Void> receiveWebhook(@RequestBody UazapWebhookRequest webhook) {
        try {
            webhookService.processWebhook(webhook);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            // Log do erro mas retorna 200 para não causar retry infinito no n8n
            return ResponseEntity.ok().build();
        }
    }

    /**
     * GET /api/v1/whatsapp/sdr/status
     * Obtém o status do agente SDR
     */
    @GetMapping("/sdr/status")
    public ResponseEntity<SDRAgentStatusResponse> getSDRAgentStatus(@AuthenticationPrincipal User user) {
        SDRAgentStatusResponse status = whatsAppService.getSDRAgentStatus(user);
        return ResponseEntity.ok(status);
    }

    /**
     * POST /api/v1/whatsapp/sdr/connect
     * Conecta o Agente SDR (Gera QR Code)
     */
    @PostMapping("/sdr/connect")
    public ResponseEntity<Map<String, Object>> connectSDRAgent(@AuthenticationPrincipal User user) {
        Map<String, Object> result = whatsAppService.connectSDRAgent(user);
        return ResponseEntity.ok(result);
    }

    /**
     * POST /api/v1/whatsapp/sdr/disconnect
     * Desconecta o Agente SDR
     */
    @PostMapping("/sdr/disconnect")
    public ResponseEntity<Void> disconnectSDRAgent(@AuthenticationPrincipal User user) {
        whatsAppService.disconnectSDRAgent(user);
        return ResponseEntity.ok().build();
    }

    /**
     * GET /api/v1/whatsapp/settings/support-mode
     * Retorna o modo de suporte padrão para novos leads
     */
    @GetMapping("/settings/support-mode")
    public ResponseEntity<Map<String, String>> getDefaultSupportMode(@AuthenticationPrincipal User user) {
        String mode = whatsAppService.getDefaultSupportMode(user);
        return ResponseEntity.ok(Map.of("mode", mode));
    }

    /**
     * PUT /api/v1/whatsapp/settings/support-mode
     * Atualiza o modo de suporte padrão para novos leads
     */
    @PutMapping("/settings/support-mode")
    public ResponseEntity<Void> updateDefaultSupportMode(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, String> body) {
        String mode = body.get("mode");
        whatsAppService.updateDefaultSupportMode(user, mode);
        return ResponseEntity.ok().build();
    }
}
