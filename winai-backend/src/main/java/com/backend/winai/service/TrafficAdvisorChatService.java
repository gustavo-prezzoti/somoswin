package com.backend.winai.service;

import com.backend.winai.dto.social.*;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.TrafficAdvisorChat;
import com.backend.winai.entity.User;
import com.backend.winai.entity.SystemPrompt;
import com.backend.winai.repository.TrafficAdvisorChatRepository;
import com.backend.winai.repository.SystemPromptRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class TrafficAdvisorChatService {

    private final TrafficAdvisorChatRepository chatRepository;
    private final OpenAiService openAiService;
    private final ObjectMapper objectMapper;
    private final ChatMemoryService chatMemoryService;
    private final SystemPromptRepository systemPromptRepository;

    @Transactional(readOnly = true)
    public List<SocialChatResponse> listChats(User user) {
        return chatRepository.findByCompanyOrderByCreatedAtDesc(user.getCompany())
                .stream()
                .map(chat -> SocialChatResponse.builder()
                        .id(chat.getId())
                        .title(chat.getTitle())
                        .lastMessage(chat.getLastMessage())
                        .createdAt(chat.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SocialChatDetailResponse getChatDetails(UUID chatId, User user) {
        TrafficAdvisorChat chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new RuntimeException("Chat não encontrado"));

        if (!chat.getCompany().getId().equals(user.getCompany().getId())) {
            throw new RuntimeException("Acesso negado");
        }

        List<ChatMessageDTO> messages = new ArrayList<>();
        try {
            if (chat.getFullHistory() != null) {
                messages = objectMapper.readValue(chat.getFullHistory(), new TypeReference<List<ChatMessageDTO>>() {
                });
            }
        } catch (Exception e) {
            log.error("Erro ao ler histórico do chat", e);
        }

        return SocialChatDetailResponse.builder()
                .id(chat.getId())
                .title(chat.getTitle())
                .messages(messages)
                .build();
    }

    @Transactional
    public SendMessageResponse sendMessage(SendMessageRequest request, User user) {
        TrafficAdvisorChat chat;
        List<ChatMessageDTO> messages = new ArrayList<>();
        Company company = user.getCompany();

        if (request.getChatId() != null) {
            chat = chatRepository.findById(request.getChatId())
                    .orElseThrow(() -> new RuntimeException("Chat não encontrado"));

            if (!chat.getCompany().getId().equals(company.getId())) {
                throw new RuntimeException("Acesso negado");
            }

            try {
                if (chat.getFullHistory() != null) {
                    messages = objectMapper.readValue(chat.getFullHistory(), new TypeReference<List<ChatMessageDTO>>() {
                    });
                }
            } catch (Exception e) {
                log.error("Erro ao ler histórico", e);
            }
        } else {
            chat = TrafficAdvisorChat.builder()
                    .company(company)
                    .title("Novo Chat")
                    .createdAt(ZonedDateTime.now())
                    .build();
            chat = chatRepository.save(chat);
        }

        // Build system prompt for Traffic Advisor
        String systemPrompt = buildTrafficAdvisorSystemPrompt();

        // Add user message
        ChatMessageDTO userMsg = ChatMessageDTO.builder()
                .role("user")
                .content(request.getMessage())
                .build();
        messages.add(userMsg);

        // Map for OpenAI
        List<OpenAiService.ChatMessage> history = messages.stream()
                .map(m -> new OpenAiService.ChatMessage(m.getRole(), m.getContent()))
                .collect(Collectors.toList());

        // Retry logic for OpenAI API call
        String aiResponse = null;
        Exception lastException = null;
        final int MAX_RETRIES = 10;

        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                log.debug("🔄 Attempting to get AI response (attempt {}/{})", attempt, MAX_RETRIES);
                aiResponse = openAiService.generateResponse(systemPrompt, request.getMessage(), history);

                if (aiResponse != null && !aiResponse.trim().isEmpty()) {
                    log.info("✅ AI response received successfully on attempt {}: {} chars", attempt,
                            aiResponse.length());
                    break;
                } else {
                    log.warn("⚠️ AI returned empty response on attempt {}/{}", attempt, MAX_RETRIES);
                    if (attempt < MAX_RETRIES) {
                        long delayMs = 1000L * attempt;
                        log.debug("⏳ Waiting {} ms before retry...", delayMs);
                        Thread.sleep(delayMs);
                    }
                }
            } catch (Exception e) {
                lastException = e;
                log.warn("❌ Error getting AI response on attempt {}/{}: {} | {}",
                        attempt, MAX_RETRIES, e.getClass().getSimpleName(), e.getMessage());

                if (attempt < MAX_RETRIES) {
                    try {
                        long delayMs = 1000L * attempt;
                        log.debug("⏳ Waiting {} ms before retry...", delayMs);
                        Thread.sleep(delayMs);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    }
                }
            }
        }

        if (aiResponse == null || aiResponse.trim().isEmpty()) {
            log.error("🚨 Failed to get AI response after {} attempts", MAX_RETRIES);

            String errorMessage = "Desculpe, tive um problema ao processar sua resposta.";
            if (lastException != null) {
                String excMessage = lastException.getMessage();
                log.error("Last exception details: {}", excMessage, lastException);
                errorMessage += " (" + lastException.getClass().getSimpleName() + ")";
            }

            aiResponse = "Desculpe, tive um problema ao processar sua resposta. " +
                    "Verifique sua chave de API do OpenAI ou tente novamente.";
        }

        ChatMessageDTO aiMsg = ChatMessageDTO.builder()
                .role("assistant")
                .content(aiResponse)
                .build();
        messages.add(aiMsg);

        // Persistent update logic
        try {
            chat.setLastMessage(aiResponse.length() > 250 ? aiResponse.substring(0, 247) + "..." : aiResponse);
            chat.setFullHistory(objectMapper.writeValueAsString(messages));
            if (chat.getTitle() == null || chat.getTitle().equals("Novo Chat")) {
                chat.setTitle(request.getMessage().length() > 30 ? request.getMessage().substring(0, 30) + "..."
                        : request.getMessage());
            }
            chatRepository.save(chat);
            log.debug("Chat saved successfully with {} messages", messages.size());

            // Redis Memory update
            chatMemoryService.saveMessage(chat.getId().toString(), "user", request.getMessage());
            chatMemoryService.saveMessage(chat.getId().toString(), "assistant", aiResponse);

        } catch (Exception e) {
            log.error("Erro ao salvar chat", e);
        }

        return SendMessageResponse.builder()
                .message(aiMsg)
                .chatId(chat.getId())
                .build();
    }

    private String buildTrafficAdvisorSystemPrompt() {
        // Busca o prompt mestre configurado no Admin para TRAFFIC_PAID
        return systemPromptRepository.findByCategoryAndIsActiveTrueAndIsDefaultTrue("TRAFFIC_PAID")
                .map(SystemPrompt::getContent)
                .orElse(getDefaultTrafficAdvisorPrompt());
    }

    private String getDefaultTrafficAdvisorPrompt() {
        return """
                Você é um especialista em tráfego pago e marketing digital chamado Traffic Advisor.

                Sua especialidade inclui:
                - Meta Ads (Facebook e Instagram)
                - Google Ads
                - TikTok Ads
                - Otimização de ROAS e CPA
                - Análise de métricas de campanha
                - Estratégias de remarketing
                - Copywriting para anúncios
                - Segmentação de público

                Responda sempre de forma prática e acionável, com dados e exemplos quando possível.
                Use emojis para destacar pontos importantes.
                Formate suas respostas em Markdown quando apropriado.
                """;
    }

    @Transactional
    public void deleteChat(UUID chatId, User user) {
        TrafficAdvisorChat chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new RuntimeException("Chat não encontrado"));

        if (!chat.getCompany().getId().equals(user.getCompany().getId())) {
            throw new RuntimeException("Acesso negado");
        }

        chatRepository.delete(chat);
        chatMemoryService.clearHistory(chatId.toString());
    }
}
