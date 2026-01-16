package com.backend.winai.controller;

import com.backend.winai.dto.request.SendMediaMessageRequest;
import com.backend.winai.dto.request.SendWhatsAppMessageRequest;
import com.backend.winai.dto.response.WhatsAppConversationResponse;
import com.backend.winai.dto.response.WhatsAppMessageResponse;
import com.backend.winai.service.WhatsAppChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/whatsapp/chat")
@RequiredArgsConstructor
@Tag(name = "WhatsApp Chat", description = "Gerenciamento de conversas e histórico de mensagens do WhatsApp")
public class WhatsAppChatController {

    private final WhatsAppChatService chatService;

    @Operation(summary = "Listar Conversas", description = "Retorna todas as conversas de uma empresa")
    @GetMapping("/conversations")
    public ResponseEntity<List<WhatsAppConversationResponse>> getConversations(
            @Parameter(description = "ID da empresa") @RequestParam UUID companyId,
            @Parameter(description = "Incluir mensagens recentes") @RequestParam(defaultValue = "false") Boolean includeMessages) {
        return ResponseEntity.ok(chatService.getConversationsByCompany(companyId, includeMessages));
    }

    @Operation(summary = "Listar Conversas do Usuário", description = "Retorna conversas filtradas pelas conexões do WhatsApp do usuário")
    @GetMapping("/conversations/user")
    public ResponseEntity<List<WhatsAppConversationResponse>> getUserConversations(
            @Parameter(description = "ID do usuário") @RequestParam UUID userId,
            @Parameter(description = "ID da empresa") @RequestParam UUID companyId,
            @Parameter(description = "Incluir mensagens recentes") @RequestParam(defaultValue = "false") Boolean includeMessages) {
        return ResponseEntity.ok(chatService.getConversationsByUserConnections(userId, companyId, includeMessages));
    }

    @Operation(summary = "Obter Conversa", description = "Retorna uma conversa específica por ID")
    @GetMapping("/conversations/{conversationId}")
    public ResponseEntity<WhatsAppConversationResponse> getConversation(
            @PathVariable UUID conversationId,
            @Parameter(description = "Incluir mensagens recentes") @RequestParam(defaultValue = "true") Boolean includeMessages) {
        return ResponseEntity.ok(chatService.getConversationById(conversationId, includeMessages));
    }

    @Operation(summary = "Listar Mensagens", description = "Retorna as mensagens de uma conversa com paginação")
    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<List<WhatsAppMessageResponse>> getMessages(
            @PathVariable UUID conversationId,
            @Parameter(description = "Número da página (0..N)") @RequestParam(defaultValue = "0") Integer page,
            @Parameter(description = "Limite de mensagens por página") @RequestParam(defaultValue = "20") Integer limit) {
        return ResponseEntity.ok(chatService.getMessagesByConversation(conversationId, page, limit));
    }

    @Operation(summary = "Mensagens por Lead", description = "Retorna todas as mensagens de um lead")
    @GetMapping("/leads/{leadId}/messages")
    public ResponseEntity<List<WhatsAppMessageResponse>> getMessagesByLead(@PathVariable UUID leadId) {
        return ResponseEntity.ok(chatService.getMessagesByLead(leadId));
    }

    @Operation(summary = "Enviar Mensagem de Texto", description = "Envia uma mensagem de texto via WhatsApp")
    @PostMapping("/send/text")
    public ResponseEntity<WhatsAppMessageResponse> sendTextMessage(
            @RequestBody SendWhatsAppMessageRequest request,
            @Parameter(description = "ID da empresa") @RequestParam UUID companyId) {
        return ResponseEntity.ok(chatService.sendTextMessage(request, companyId));
    }

    @Operation(summary = "Enviar Mídia (Upload)", description = "Envia uma mensagem de mídia com upload de arquivo para Supabase")
    @PostMapping(value = "/send/media/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<WhatsAppMessageResponse> sendMediaWithUpload(
            @Parameter(description = "Número do telefone") @RequestParam String phoneNumber,
            @Parameter(description = "ID do lead (opcional)") @RequestParam(required = false) UUID leadId,
            @Parameter(description = "Legenda (opcional)") @RequestParam(required = false) String caption,
            @Parameter(description = "Tipo de mídia: image, video, audio, document") @RequestParam String mediaType,
            @Parameter(description = "Arquivo de mídia") @RequestParam("file") MultipartFile file,
            @Parameter(description = "ID da empresa") @RequestParam UUID companyId,
            @Parameter(description = "Push to talk (apenas para áudio)") @RequestParam(defaultValue = "false") Boolean ptt) {
        return ResponseEntity
                .ok(chatService.sendMediaMessage(phoneNumber, leadId, caption, mediaType, file, companyId, ptt));
    }

    @Operation(summary = "Enviar Mídia (URL)", description = "Envia uma mensagem de mídia a partir de uma URL externa")
    @PostMapping("/send/media/url")
    public ResponseEntity<WhatsAppMessageResponse> sendMediaFromUrl(
            @RequestBody SendMediaMessageRequest request,
            @Parameter(description = "ID da empresa") @RequestParam UUID companyId) {
        return ResponseEntity.ok(chatService.sendMediaMessageFromUrl(request, companyId));
    }

    @Operation(summary = "Marcar como Lida", description = "Marca todas as mensagens de uma conversa como lidas")
    @PutMapping("/conversations/{conversationId}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable UUID conversationId) {
        chatService.markConversationAsRead(conversationId);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Arquivar/Desarquivar", description = "Alterna o estado de arquivamento de uma conversa")
    @PutMapping("/conversations/{conversationId}/archive")
    public ResponseEntity<Void> toggleArchive(@PathVariable UUID conversationId) {
        chatService.toggleArchiveConversation(conversationId);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Bloquear/Desbloquear", description = "Alterna o estado de bloqueio de uma conversa")
    @PutMapping("/conversations/{conversationId}/block")
    public ResponseEntity<Void> toggleBlock(@PathVariable UUID conversationId) {
        chatService.toggleBlockConversation(conversationId);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Alternar Modo de Suporte", description = "Alterna entre modo IA e HUMAN para uma conversa")
    @PutMapping("/conversations/{conversationId}/support-mode")
    public ResponseEntity<WhatsAppConversationResponse> toggleSupportMode(
            @PathVariable UUID conversationId,
            @Parameter(description = "Modo: IA ou HUMAN") @RequestParam String mode) {
        return ResponseEntity.ok(chatService.toggleSupportMode(conversationId, mode));
    }
}
