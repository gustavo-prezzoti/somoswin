package com.backend.winai.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.backend.winai.entity.KnowledgeBase;
import com.backend.winai.entity.KnowledgeBaseConnection;
import com.backend.winai.entity.UserWhatsAppConnection;
import com.backend.winai.entity.WhatsAppConversation;
import com.backend.winai.entity.WhatsAppMessage;
import com.backend.winai.repository.KnowledgeBaseConnectionRepository;
import com.backend.winai.repository.UserWhatsAppConnectionRepository;
import com.backend.winai.repository.WhatsAppConversationRepository;
import com.backend.winai.repository.WhatsAppMessageRepository;
import com.backend.winai.entity.Notification;
import com.backend.winai.entity.User;
import com.backend.winai.repository.UserRepository;
import com.backend.winai.repository.NotificationRepository;
import com.backend.winai.dto.response.WhatsAppConversationResponse;
import com.backend.winai.dto.response.WhatsAppMessageResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class AIAgentService {

    private final OpenAiService openAiService;
    private final KnowledgeBaseConnectionRepository connectionRepository;
    private final UserWhatsAppConnectionRepository whatsAppConnectionRepository;
    private final WhatsAppMessageRepository messageRepository;
    private final UazapService uazapService;
    private final WhatsAppConversationRepository conversationRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    @Transactional
    public String processMessageWithAI(WhatsAppConversation conversation, String userMessage, String leadName) {
        try {
            // Recarregar a conversation com a company para evitar
            // LazyInitializationException
            WhatsAppConversation conv = conversationRepository.findByIdWithCompany(conversation.getId())
                    .orElse(conversation);

            // REGRA: Se estiver no modo HUMANO, a IA não responde mais
            if ("HUMAN".equalsIgnoreCase(conv.getSupportMode())) {
                log.info("Conversation {} is in HUMAN mode, skipping AI response", conv.getId());
                return null;
            }

            if (!openAiService.isChatEnabled()) {
                log.warn("OpenAI service is not enabled, skipping AI processing");
                return null;
            }

            KnowledgeBase knowledgeBase = findKnowledgeBaseForConversation(conv);

            if (knowledgeBase == null) {
                log.debug("No knowledge base found for conversation: {}", conv.getId());
                return null;
            }

            if (!Boolean.TRUE.equals(knowledgeBase.getIsActive())) {
                log.debug("Knowledge base is not active: {}", knowledgeBase.getId());
                return null;
            }

            log.info("Processing message with AI for conversation: {}, using knowledge base: {}",
                    conv.getId(), knowledgeBase.getName());

            List<String> recentMessages = getRecentConversationHistory(conv.getId(), 10);

            // BRANCHING: Check for Custom System Templates (e.g., Clinicorp)
            if ("clinicorp".equalsIgnoreCase(knowledgeBase.getSystemTemplate())) {
                log.info("Activate Clinicorp System Template for conversation: {} using KB: {}", conv.getId(),
                        knowledgeBase.getId());
                String contextInfo = "Data atual: " + java.time.LocalDateTime.now() +
                        "\nNome do Paciente/Lead: " + (leadName != null ? leadName : "Não identificado");

                String aiResponse = openAiService.generateClinicorpResponse(userMessage, recentMessages, contextInfo,
                        knowledgeBase.getAgentPrompt());

                if (aiResponse != null) {
                    return aiResponse;
                }
            }

            // Standard Flow
            // Enhance Prompt with Lead Name if available
            String enhancedAgentPrompt = knowledgeBase.getAgentPrompt();
            if (leadName != null && !leadName.isEmpty()) {
                enhancedAgentPrompt = (enhancedAgentPrompt != null ? enhancedAgentPrompt : "")
                        + "\n[CONTEXTO DO USUÁRIO]\nNome do usuário: " + leadName;
            }

            String aiResponse = openAiService.generateResponseWithContext(
                    enhancedAgentPrompt,
                    knowledgeBase.getContent(),
                    userMessage,
                    recentMessages);

            if (aiResponse != null && !aiResponse.isEmpty()) {
                log.info("AI generated response for conversation {}: {} chars",
                        conv.getId(), aiResponse.length());
                return aiResponse;
            }

            log.warn("AI returned empty response for conversation: {}", conv.getId());
            return null;

        } catch (Exception e) {
            log.error("Error processing message with AI for conversation {}: {}",
                    conversation.getId(), e.getMessage(), e);
            return null;
        }
    }

    public boolean sendAIResponse(WhatsAppConversation conversation, String aiResponse) {
        try {
            if (aiResponse == null || aiResponse.isEmpty()) {
                return false;
            }

            String phoneNumber = conversation.getPhoneNumber();
            String baseUrl = conversation.getUazapBaseUrl();
            String token = conversation.getUazapToken();

            if (baseUrl == null || token == null) {
                UserWhatsAppConnection connection = findConnectionForConversation(conversation);
                if (connection != null) {
                    baseUrl = connection.getInstanceBaseUrl();
                    token = connection.getInstanceToken();
                }
            }

            if (baseUrl == null || token == null || phoneNumber == null) {
                log.warn("Missing credentials to send AI response for conversation: {}", conversation.getId());
                return false;
            }

            uazapService.sendTextMessage(phoneNumber, aiResponse, baseUrl, token);
            log.info("AI response sent successfully to {} for conversation {}", phoneNumber, conversation.getId());
            return true;

        } catch (Exception e) {
            log.error("Failed to send AI response for conversation {}: {}",
                    conversation.getId(), e.getMessage(), e);
            return false;
        }
    }

    @Transactional
    public String processAndRespond(WhatsAppConversation conversation, String userMessage, String leadName) {
        log.info("Starting processAndRespond for conversation: {}, user message: {} chars",
                conversation.getId(), userMessage != null ? userMessage.length() : 0);

        String aiResponse = processMessageWithAI(conversation, userMessage, leadName);

        if (aiResponse != null && !aiResponse.isEmpty()) {
            log.info("AI generated response: {} chars", aiResponse.length());

            // Check for Human Handoff Request from Tool Call
            if ("HUMAN_HANDOFF_REQUESTED".equals(aiResponse)) {
                handleHumanHandoff(conversation);
                return "HUMAN_HANDOFF_REQUESTED";
            }

            List<String> chunks = splitMessage(aiResponse);
            log.info("Split response into {} chunks", chunks.size());

            for (String chunk : chunks) {
                log.debug("Processing chunk: {} chars", chunk.length());
                // Enviar msg via Uazap
                boolean sent = sendAIResponse(conversation, chunk);

                if (sent) {
                    log.debug("Chunk sent via Uazap, now persisting and notifying");
                    // Persistir e Notificar cada fragmento como uma mensagem separada
                    persistAndNotify(conversation, chunk);

                    // Pequeno delay entre mensagens para parecer mais natural (humano digitando)
                    try {
                        Thread.sleep(2500); // 2.5s entre mensagens
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                } else {
                    log.warn("Failed to send chunk via Uazap");
                }
            }
            return aiResponse;
        } else {
            log.warn("AI response is null or empty");
        }

        return null;
    }

    /**
     * Divide a resposta da IA em partes lógicas para envio separado no WhatsApp.
     * Prioriza parágrafos (\n\n) e depois quebras de linha (\n).
     */
    private List<String> splitMessage(String content) {
        List<String> chunks = new ArrayList<>();
        if (content == null || content.isEmpty())
            return chunks;

        // Divide por parágrafos duplos primeiro
        String[] paragraphs = content.split("\\n\\n+");

        for (String p : paragraphs) {
            String trimmed = p.trim();
            if (trimmed.isEmpty())
                continue;

            // Se o parágrafo ainda for muito longo (> 500 chars), divide por quebra de
            // linha simples
            if (trimmed.length() > 500) {
                String[] lines = trimmed.split("\\n+");
                for (String line : lines) {
                    String lineTrimmed = line.trim();
                    if (!lineTrimmed.isEmpty())
                        chunks.add(lineTrimmed);
                }
            } else {
                chunks.add(trimmed);
            }
        }

        return chunks;
    }

    private void persistAndNotify(WhatsAppConversation conversation, String aiResponse) {
        try {
            if (aiResponse == null || aiResponse.trim().isEmpty()) {
                log.warn("Received empty AI response for conversation: {}", conversation.getId());
                return;
            }

            // Salvar a resposta da IA como mensagem
            WhatsAppMessage aiMessage = WhatsAppMessage.builder()
                    .conversation(conversation)
                    .lead(conversation.getLead())
                    .messageId(UUID.randomUUID().toString())
                    .content(aiResponse)
                    .fromMe(true)
                    .messageType("text")
                    .messageTimestamp(System.currentTimeMillis())
                    .status("sent")
                    .isGroup(false)
                    .build();

            log.debug("Before saving - Message content length: {}, content preview: {}",
                    aiResponse.length(), aiResponse.substring(0, Math.min(100, aiResponse.length())));

            aiMessage = messageRepository.save(aiMessage);

            log.info("AI message persisted successfully with ID: {}, content: {} chars",
                    aiMessage.getId(), aiMessage.getContent() != null ? aiMessage.getContent().length() : 0);

            // Atualizar conversa
            conversation.setLastMessageText(
                    aiResponse.length() > 250 ? aiResponse.substring(0, 247) + "..." : aiResponse);
            conversation.setLastMessageTimestamp(aiMessage.getMessageTimestamp());
            conversationRepository.save(conversation);

            log.debug("Conversation updated with last message timestamp: {}", conversation.getLastMessageTimestamp());

            // Enviar atualização WebSocket
            sendWebSocketUpdate(conversation.getCompany().getId(), aiMessage, conversation);

        } catch (Exception e) {
            log.error("Erro ao persistir/notificar resposta da IA: {}", e.getMessage(), e);
        }
    }

    private void sendWebSocketUpdate(UUID companyId, WhatsAppMessage message, WhatsAppConversation conversation) {
        try {
            if (message != null) {
                log.debug("Sending WebSocket update - Message ID: {}, Content length: {}, From me: {}",
                        message.getId(),
                        message.getContent() != null ? message.getContent().length() : 0,
                        message.getFromMe());
            } else {
                log.debug("Sending WebSocket update for conversation: {}", conversation.getId());
            }

            // Converter para DTOs para evitar LazyInitializationException durante
            // serialização JSON
            WhatsAppMessageResponse messageDto = toMessageResponse(message);
            WhatsAppConversationResponse conversationDto = toConversationResponse(conversation);

            com.backend.winai.dto.response.WebSocketMessage wsMessage = com.backend.winai.dto.response.WebSocketMessage
                    .builder()
                    .type("NEW_MESSAGE")
                    .message(messageDto)
                    .conversation(conversationDto)
                    .companyId(companyId)
                    .build();

            messagingTemplate.convertAndSend("/topic/whatsapp/" + companyId, wsMessage);

            com.backend.winai.dto.response.WebSocketMessage convUpdate = com.backend.winai.dto.response.WebSocketMessage
                    .builder()
                    .type("CONVERSATION_UPDATED")
                    .conversation(conversationDto)
                    .companyId(companyId)
                    .build();

            messagingTemplate.convertAndSend("/topic/whatsapp/conversations/" + companyId, convUpdate);

            log.info("WebSocket updates sent successfully for company: {}", companyId);
        } catch (Exception e) {
            log.error("Erro ao enviar update WebSocket: {}", e.getMessage(), e);
        }
    }

    @Transactional
    public void handleHumanHandoff(WhatsAppConversation conversation) {
        log.info("Initiating human handoff for conversation: {}", conversation.getId());

        // 1. Update support mode
        conversation.setSupportMode("HUMAN");
        conversationRepository.save(conversation);

        // 2. Send handoff message to client
        String handoffMsg = "Entendi! Vou chamar nossa especialista humana para continuar seu atendimento agora mesmo. 🧡 Aguarde só um momento. 🌿✨";
        sendAIResponse(conversation, handoffMsg);
        persistAndNotify(conversation, handoffMsg);

        // 3. Create notifications for all company users
        if (conversation.getCompany() != null) {
            List<User> companyUsers = userRepository.findByCompanyId(conversation.getCompany().getId());
            String title = "Atendimento Humano Solicitado";
            String message = "O contato " + (conversation.getContactName() != null ? conversation.getContactName()
                    : conversation.getPhoneNumber()) + " solicitou um atendente.";

            for (User user : companyUsers) {
                Notification notification = Notification.builder()
                        .user(user)
                        .title(title)
                        .message(message)
                        .type("WARNING")
                        .relatedEntityType("CONVERSATION")
                        .relatedEntityId(conversation.getId())
                        .actionUrl("/whatsapp?chatId=" + conversation.getId())
                        .read(false)
                        .build();
                notificationRepository.save(notification);
            }

            // 4. Also notify via WebSocket about the mode change for agents online
            sendWebSocketUpdate(conversation.getCompany().getId(), null, conversation);

            // 5. Send explicit mode change and notification events
            com.backend.winai.dto.response.WebSocketMessage modeChange = com.backend.winai.dto.response.WebSocketMessage
                    .builder()
                    .type("SUPPORT_MODE_CHANGED")
                    .conversationId(conversation.getId().toString())
                    .mode("HUMAN")
                    .companyId(conversation.getCompany().getId())
                    .build();
            messagingTemplate.convertAndSend("/topic/whatsapp/" + conversation.getCompany().getId(), modeChange);

            com.backend.winai.dto.response.WebSocketMessage notificationEvent = com.backend.winai.dto.response.WebSocketMessage
                    .builder()
                    .type("NOTIFICATION_RECEIVED")
                    .companyId(conversation.getCompany().getId())
                    .build();
            messagingTemplate.convertAndSend("/topic/whatsapp/" + conversation.getCompany().getId(), notificationEvent);
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
                .companyId(conversation.getCompany() != null ? conversation.getCompany().getId() : null)
                .leadId(conversation.getLead() != null ? conversation.getLead().getId() : null)
                .phoneNumber(conversation.getPhoneNumber())
                .waChatId(conversation.getWaChatId())
                .contactName(conversation.getContactName())
                .profilePictureUrl(conversation.getProfilePictureUrl())
                .unreadCount(conversation.getUnreadCount())
                .lastMessageText(conversation.getLastMessageText())
                .lastMessageTimestamp(conversation.getLastMessageTimestamp())
                .isArchived(conversation.getIsArchived())
                .isBlocked(conversation.getIsBlocked())
                .uazapInstance(conversation.getUazapInstance())
                .createdAt(conversation.getCreatedAt())
                .updatedAt(conversation.getUpdatedAt())
                .build();
    }

    private KnowledgeBase findKnowledgeBaseForConversation(WhatsAppConversation conversation) {
        try {
            UserWhatsAppConnection whatsAppConnection = findConnectionForConversation(conversation);

            if (whatsAppConnection == null) {
                log.debug("No WhatsApp connection found for conversation: {}", conversation.getId());
                return null;
            }

            Optional<KnowledgeBaseConnection> kbConnection = connectionRepository.findByConnection(whatsAppConnection);

            if (kbConnection.isPresent()) {
                return kbConnection.get().getKnowledgeBase();
            }

            log.debug("No knowledge base linked to connection: {}", whatsAppConnection.getId());
            return null;

        } catch (Exception e) {
            log.error("Error finding knowledge base for conversation: {}", e.getMessage());
            return null;
        }
    }

    private UserWhatsAppConnection findConnectionForConversation(WhatsAppConversation conversation) {
        try {
            String instanceName = conversation.getUazapInstance();

            if (instanceName != null && !instanceName.isEmpty()) {
                return whatsAppConnectionRepository.findByInstanceName(instanceName)
                        .stream()
                        .findFirst()
                        .orElse(null);
            }

            String baseUrl = conversation.getUazapBaseUrl();
            String token = conversation.getUazapToken();

            if (baseUrl != null && token != null) {
                return whatsAppConnectionRepository.findByInstanceBaseUrlAndInstanceToken(baseUrl, token)
                        .orElse(null);
            }

            return null;

        } catch (Exception e) {
            log.error("Error finding connection for conversation: {}", e.getMessage());
            return null;
        }
    }

    private List<String> getRecentConversationHistory(UUID conversationId, int limit) {
        try {
            List<WhatsAppMessage> recentMessages = messageRepository
                    .findByConversationIdOrderByMessageTimestampDesc(conversationId)
                    .stream()
                    .limit(limit)
                    .collect(Collectors.toList());

            java.util.Collections.reverse(recentMessages);

            List<String> history = new ArrayList<>();
            for (WhatsAppMessage msg : recentMessages) {
                if (msg.getContent() != null && !msg.getContent().isEmpty()) {
                    history.add(msg.getContent());
                }
            }

            return history;

        } catch (Exception e) {
            log.error("Error getting conversation history: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    public boolean isAIEnabledForConversation(WhatsAppConversation conversation) {
        if (!openAiService.isChatEnabled()) {
            return false;
        }

        KnowledgeBase kb = findKnowledgeBaseForConversation(conversation);
        return kb != null && Boolean.TRUE.equals(kb.getIsActive());
    }
}
