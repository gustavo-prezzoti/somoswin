package com.backend.winai.service;

import com.backend.winai.dto.social.*;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.SocialGrowthChat;
import com.backend.winai.entity.SocialMediaProfile;
import com.backend.winai.entity.User;
import com.backend.winai.entity.SystemPrompt;
import com.backend.winai.repository.SocialGrowthChatRepository;
import com.backend.winai.repository.SocialMediaProfileRepository;
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
public class SocialGrowthChatService {

    private final SocialGrowthChatRepository chatRepository;
    private final SocialMediaProfileRepository profileRepository;
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
        SocialGrowthChat chat = chatRepository.findById(chatId)
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
        SocialGrowthChat chat;
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
            chat = SocialGrowthChat.builder()
                    .company(company)
                    .title("Novo Chat")
                    .createdAt(ZonedDateTime.now())
                    .build();
            chat = chatRepository.save(chat); // Save early to get ID
        }

        // Context Construction
        SocialMediaProfile profile = profileRepository.findByCompany(company)
                .orElseGet(() -> profileRepository.save(SocialMediaProfile.builder()
                        .company(company)
                        .isCompleted(false)
                        .build()));

        String systemPrompt = buildPersistentSystemPrompt(profile);

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
                    break; // Success, exit retry loop
                } else {
                    log.warn("⚠️ AI returned empty response on attempt {}/{}", attempt, MAX_RETRIES);
                    if (attempt < MAX_RETRIES) {
                        long delayMs = 1000L * attempt;
                        log.debug("⏳ Waiting {} ms before retry...", delayMs);
                        Thread.sleep(delayMs); // Exponential backoff
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
                        Thread.sleep(delayMs); // Exponential backoff
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

            // More specific error message
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

    private String buildPersistentSystemPrompt(SocialMediaProfile profile) {
        StringBuilder sb = new StringBuilder();

        // Busca o prompt mestre configurado no Admin para SOCIAL_MEDIA
        String dynamicPrompt = systemPromptRepository.findByCategoryAndIsActiveTrueAndIsDefaultTrue("SOCIAL_MEDIA")
                .map(SystemPrompt::getContent)
                .orElse(null);

        if (dynamicPrompt != null && !dynamicPrompt.trim().isEmpty()) {
            sb.append(dynamicPrompt);
        }

        // Adiciona os dados estratégicos do negócio como contexto adicional para a IA
        if (profile.isCompleted()) {
            sb.append("\n\n---\n## 🎯 CONTEXTO ESTRATÉGICO DO NEGÓCIO\n\n");
            sb.append("**Marca/Negócio:** ")
                    .append(profile.getNameNegocio() != null ? profile.getNameNegocio() : "[Não informado]")
                    .append("\n");
            sb.append("**Nicho/Segmento:** ")
                    .append(profile.getNichoPrimario() != null ? profile.getNichoPrimario() : "[Não informado]")
                    .append("\n");
            sb.append("**Proposta de Valor:** ")
                    .append(profile.getPropostaValor() != null ? profile.getPropostaValor() : "[Não informado]")
                    .append("\n");
            sb.append("**Avatar (Público-alvo):** ")
                    .append(profile.getAvatarDetalhado() != null ? profile.getAvatarDetalhado() : "[Não informado]")
                    .append("\n");
            sb.append("**Dores do Público:** ")
                    .append(profile.getDoresEspecificas() != null ? profile.getDoresEspecificas() : "[Não informado]")
                    .append("\n");
            sb.append("**Tom de Voz Desejado:** ")
                    .append(profile.getTomVoz() != null ? profile.getTomVoz() : "[Não informado]").append("\n");
            sb.append(
                    "\n*Utilize os dados acima para personalizar todas as sugestões e análises para este cliente específico.*\n---\n");
        }

        return sb.toString();
    }

    @Transactional
    public void deleteChat(UUID chatId, User user) {
        SocialGrowthChat chat = chatRepository.findById(chatId)
                .orElseThrow(() -> new RuntimeException("Chat não encontrado"));

        if (!chat.getCompany().getId().equals(user.getCompany().getId())) {
            throw new RuntimeException("Acesso negado");
        }

        chatRepository.delete(chat);
        chatMemoryService.clearHistory(chatId.toString());
    }
}
