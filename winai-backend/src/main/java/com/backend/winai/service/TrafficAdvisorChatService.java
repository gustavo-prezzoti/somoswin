package com.backend.winai.service;

import com.backend.winai.dto.social.*;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.TrafficAdvisorChat;
import com.backend.winai.entity.User;
import com.backend.winai.repository.CompanyRepository;
import com.backend.winai.repository.TrafficAdvisorChatRepository;
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
@Transactional(readOnly = true)
public class TrafficAdvisorChatService {

    private final TrafficAdvisorChatRepository chatRepository;
    private final OpenAiService openAiService;
    private final ObjectMapper objectMapper;
    private final ChatMemoryService chatMemoryService;
    private final CompanyRepository companyRepository;

    @Transactional(readOnly = true)
    public List<SocialChatResponse> listChats(User user) {
        Company company = companyRepository.findById(user.getCompany().getId())
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));

        return chatRepository.findByCompanyOrderByCreatedAtDesc(company)
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
        Company company = companyRepository.findById(user.getCompany().getId())
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));

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

        // --- ATTACHMENT HANDLING (same as Social Growth: image analysis + document text) ---
        String finalUserMessage = request.getMessage() != null ? request.getMessage() : "";
        String imageUrl = null;

        if (request.getAttachmentUrl() != null && !request.getAttachmentUrl().isEmpty()) {
            String type = request.getAttachmentType() != null ? request.getAttachmentType().toUpperCase() : "";

            if ("IMAGE".equals(type)) {
                imageUrl = processImageAttachment(request.getAttachmentUrl());
            } else if ("DOCUMENT".equals(type)) {
                String extractedText = extractDocumentContent(request.getAttachmentUrl());
                if (extractedText != null) {
                    finalUserMessage += "\n\n[CONTEÚDO DO ARQUIVO ANEXO]:\n" + extractedText;
                }
            }
        }

        if ((finalUserMessage == null || finalUserMessage.trim().isEmpty()) && request.getAttachmentUrl() != null) {
            if ("IMAGE".equals(request.getAttachmentType())) {
                finalUserMessage = "Analise esta imagem.";
            } else {
                finalUserMessage = "Analise este documento.";
            }
        }

        // Add user message (with attachment for history/display)
        ChatMessageDTO userMsg = ChatMessageDTO.builder()
                .role("user")
                .content(finalUserMessage)
                .attachmentUrl(request.getAttachmentUrl())
                .attachmentType(request.getAttachmentType())
                .build();
        messages.add(userMsg);

        // Map for OpenAI (text only; image passed separately when present)
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
                aiResponse = openAiService.generateResponse(systemPrompt, finalUserMessage, imageUrl, history);

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

            aiResponse = "Desculpe, tive um problema ao processar sua resposta. " +
                    "Verifique sua chave de API do OpenAI ou tente novamente.";
            if (lastException != null) {
                log.error("Last exception details: {}", lastException.getMessage(), lastException);
            }
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
            // Atualização inteligente do título
            boolean isNewChat = chat.getTitle() == null || chat.getTitle().equals("Novo Chat");
            boolean isCurrentTitleShort = chat.getTitle() != null && chat.getTitle().length() < 15;
            boolean isNewMessageSubstantial = finalUserMessage != null && finalUserMessage.length() > 15;

            if (isNewChat || (isCurrentTitleShort && isNewMessageSubstantial)) {
                String newTitle = (finalUserMessage != null ? finalUserMessage : "").trim();
                if (newTitle.contains("\n")) {
                    newTitle = newTitle.split("\n")[0];
                }
                if (newTitle.length() > 40) {
                    newTitle = newTitle.substring(0, 40) + "...";
                }
                chat.setTitle(newTitle);
            }
            chatRepository.save(chat);
            log.debug("Chat saved successfully with {} messages", messages.size());

            // Redis Memory update
            chatMemoryService.saveMessage(chat.getId().toString(), "user", finalUserMessage);
            chatMemoryService.saveMessage(chat.getId().toString(), "assistant", aiResponse);

        } catch (Exception e) {
            log.error("Erro ao salvar chat", e);
        }

        return SendMessageResponse.builder()
                .message(aiMsg)
                .chatId(chat.getId())
                .build();
    }

    private String processImageAttachment(String fileUrl) {
        try {
            if (fileUrl.startsWith("data:")) {
                return fileUrl;
            }

            byte[] fileContent = null;
            String mimeType = "image/jpeg";

            if (fileUrl.startsWith("http")) {
                try (java.io.InputStream is = new java.net.URL(fileUrl).openStream()) {
                    fileContent = is.readAllBytes();
                    if (fileUrl.toLowerCase().endsWith(".png"))
                        mimeType = "image/png";
                    else if (fileUrl.toLowerCase().endsWith(".gif"))
                        mimeType = "image/gif";
                    else if (fileUrl.toLowerCase().endsWith(".webp"))
                        mimeType = "image/webp";
                }
            } else {
                java.nio.file.Path filePath = java.nio.file.Paths
                        .get(fileUrl.startsWith("/") ? fileUrl.substring(1) : fileUrl);
                if (java.nio.file.Files.exists(filePath)) {
                    fileContent = java.nio.file.Files.readAllBytes(filePath);
                    if (fileUrl.toLowerCase().endsWith(".png"))
                        mimeType = "image/png";
                }
            }

            if (fileContent != null) {
                String base64 = java.util.Base64.getEncoder().encodeToString(fileContent);
                return "data:" + mimeType + ";base64," + base64;
            }

            return null;
        } catch (Exception e) {
            log.error("Error processing image attachment", e);
            return fileUrl;
        }
    }

    private String extractDocumentContent(String fileUrl) {
        try {
            java.io.InputStream inputStream = null;

            if (fileUrl.startsWith("http")) {
                inputStream = new java.net.URL(fileUrl).openStream();
            } else {
                java.nio.file.Path filePath = java.nio.file.Paths
                        .get(fileUrl.startsWith("/") ? fileUrl.substring(1) : fileUrl);
                if (java.nio.file.Files.exists(filePath)) {
                    inputStream = java.nio.file.Files.newInputStream(filePath);
                }
            }

            if (inputStream == null) {
                return "[Erro: Arquivo não encontrado ou inacessível]";
            }

            try (java.io.InputStream is = inputStream) {
                if (fileUrl.toLowerCase().endsWith(".pdf")) {
                    try (org.apache.pdfbox.pdmodel.PDDocument document = org.apache.pdfbox.pdmodel.PDDocument
                            .load(is)) {
                        org.apache.pdfbox.text.PDFTextStripper stripper = new org.apache.pdfbox.text.PDFTextStripper();
                        return stripper.getText(document);
                    }
                } else {
                    try (java.util.Scanner s = new java.util.Scanner(is).useDelimiter("\\A")) {
                        return s.hasNext() ? s.next() : "";
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error extracting document content", e);
            return "[Erro ao ler arquivo: " + e.getMessage() + "]";
        }
    }

    private String buildTrafficAdvisorSystemPrompt() {
        return getDefaultTrafficAdvisorPrompt();
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
