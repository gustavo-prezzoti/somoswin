package com.backend.winai.service;

import com.backend.winai.dto.response.WhatsAppConversationResponse;
import com.backend.winai.dto.response.WhatsAppMessageResponse;
import com.backend.winai.dto.response.WebSocketMessage;
import com.backend.winai.entity.WhatsAppConversation;
import com.backend.winai.entity.WhatsAppMessage;
import com.backend.winai.repository.WhatsAppConversationRepository;
import com.backend.winai.repository.WhatsAppMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.backend.winai.util.WhatsAppConversationDisplayName;

import java.util.List;
import java.util.UUID;

/**
 * Serviço para broadcast de notificações WhatsApp via WebSocket.
 * Usado pelo backend quando recebe notificação do follow-up worker (mensagem persistida em outro container).
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class WhatsAppNotifyService {

    private final WhatsAppConversationRepository conversationRepository;
    private final WhatsAppMessageRepository messageRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Persiste uma mensagem da IA no banco e envia NEW_MESSAGE + CONVERSATION_UPDATED.
     * Usado pelo follow-up worker: ele envia no Uazap e chama este endpoint para salvar e notificar.
     */
    @Transactional(readOnly = false)
    public void persistAndNotifyMessage(UUID conversationId, UUID companyId, String content) {
        if (content == null || content.trim().isEmpty()) {
            log.warn("persistAndNotifyMessage: content empty for conversation {}", conversationId);
            return;
        }
        WhatsAppConversation conversation = conversationRepository.findByIdWithCompany(conversationId).orElse(null);
        if (conversation == null) {
            log.warn("Conversation not found for persist: {}", conversationId);
            return;
        }
        WhatsAppMessage message = WhatsAppMessage.builder()
                .conversation(conversation)
                .lead(conversation.getLead())
                .messageId(UUID.randomUUID().toString())
                .content(content.trim())
                .fromMe(true)
                .messageType("text")
                .messageTimestamp(System.currentTimeMillis())
                .status("sent")
                .isGroup(false)
                .build();
        message = messageRepository.saveAndFlush(message);
        String preview = content.length() > 250 ? content.substring(0, 247) + "..." : content;
        conversation.setLastMessageText(preview);
        conversation.setLastMessageTimestamp(message.getMessageTimestamp());
        conversationRepository.saveAndFlush(conversation);
        broadcastNewMessageForConversation(conversationId, companyId);
    }

    /**
     * Envia NEW_MESSAGE e CONVERSATION_UPDATED para os tópicos da empresa.
     * Usado pelo endpoint interno quando o follow-up worker persiste uma mensagem.
     */
    public void broadcastNewMessageForConversation(UUID conversationId, UUID companyId) {
        try {
            WhatsAppConversation conversation = conversationRepository.findByIdWithCompany(conversationId).orElse(null);
            if (conversation == null) {
                log.warn("Conversation not found for broadcast: {}", conversationId);
                return;
            }
            List<WhatsAppMessage> latest = messageRepository.findLatestByConversation(conversation, PageRequest.of(0, 1));
            WhatsAppMessage message = latest.isEmpty() ? null : latest.get(0);

            WhatsAppMessageResponse messageDto = message != null ? toMessageResponse(message) : null;
            WhatsAppConversationResponse conversationDto = toConversationResponse(conversation);

            if (messageDto != null) {
                WebSocketMessage wsMessage = WebSocketMessage.builder()
                        .type("NEW_MESSAGE")
                        .message(messageDto)
                        .conversation(conversationDto)
                        .companyId(companyId)
                        .build();
                messagingTemplate.convertAndSend("/topic/whatsapp/" + companyId, wsMessage);
            }

            WebSocketMessage convUpdate = WebSocketMessage.builder()
                    .type("CONVERSATION_UPDATED")
                    .conversation(conversationDto)
                    .companyId(companyId)
                    .build();
            messagingTemplate.convertAndSend("/topic/whatsapp/conversations/" + companyId, convUpdate);

            log.info("WebSocket broadcast sent for conversation {} company {}", conversationId, companyId);
        } catch (Exception e) {
            log.error("Erro ao fazer broadcast WebSocket para conversa {}: {}", conversationId, e.getMessage(), e);
        }
    }

    private WhatsAppMessageResponse toMessageResponse(WhatsAppMessage message) {
        return WhatsAppMessageResponse.builder()
                .id(message.getId())
                .conversationId(message.getConversation().getId())
                .leadId(message.getLead() != null ? message.getLead().getId() : null)
                .messageId(message.getMessageId())
                .content(message.getContent())
                .fromMe(message.getFromMe())
                .messageType(message.getMessageType())
                .mediaType(message.getMediaType())
                .mediaUrl(message.getMediaUrl())
                .mediaDuration(message.getMediaDuration())
                .transcription(message.getTranscription())
                .status(message.getStatus())
                .messageTimestamp(message.getMessageTimestamp())
                .createdAt(message.getCreatedAt())
                .build();
    }

    private WhatsAppConversationResponse toConversationResponse(WhatsAppConversation conversation) {
        return WhatsAppConversationResponse.builder()
                .id(conversation.getId())
                .leadId(conversation.getLead() != null ? conversation.getLead().getId() : null)
                .phoneNumber(conversation.getPhoneNumber())
                .waChatId(conversation.getWaChatId())
                .contactName(WhatsAppConversationDisplayName.resolve(conversation))
                .profilePictureUrl(conversation.getProfilePictureUrl())
                .unreadCount(conversation.getUnreadCount())
                .lastMessageText(conversation.getLastMessageText())
                .lastMessageTimestamp(conversation.getLastMessageTimestamp())
                .isArchived(conversation.getIsArchived())
                .isBlocked(conversation.getIsBlocked())
                .supportMode(conversation.getSupportMode())
                .createdAt(conversation.getCreatedAt())
                .updatedAt(conversation.getUpdatedAt())
                .build();
    }
}
