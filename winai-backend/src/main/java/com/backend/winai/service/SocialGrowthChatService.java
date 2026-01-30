package com.backend.winai.service;

import com.backend.winai.dto.social.*;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.SocialGrowthChat;
import com.backend.winai.entity.SocialMediaProfile;
import com.backend.winai.entity.User;
import com.backend.winai.entity.SystemPrompt;
import com.backend.winai.repository.CompanyRepository;
import com.backend.winai.repository.SocialGrowthChatRepository;
import com.backend.winai.repository.SocialMediaProfileRepository;
import com.backend.winai.repository.SystemPromptRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;

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

        // --- ATTACHMENT HANDLING ---
        String finalUserMessage = request.getMessage();
        String imageUrl = null;

        if (request.getAttachmentUrl() != null && !request.getAttachmentUrl().isEmpty()) {
            String type = request.getAttachmentType() != null ? request.getAttachmentType().toUpperCase() : "";

            if ("IMAGE".equals(type)) {
                // For images, we ALWAYS convert to Base64 to ensure reliability.
                // This avoids issues where OpenAI cannot access the Supabase URL (e.g.
                // localhost, private bucket, etc.)
                imageUrl = processImageAttachment(request.getAttachmentUrl());
            } else if ("DOCUMENT".equals(type)) {
                // For docs, we extract content and append to message
                String extractedText = extractDocumentContent(request.getAttachmentUrl());
                if (extractedText != null) {
                    finalUserMessage += "\n\n[CONTEÚDO DO ARQUIVO ANEXO]:\n" + extractedText;
                }
            }
        }

        // If message is empty but has attachment, set a default description for context
        // and title
        if ((finalUserMessage == null || finalUserMessage.trim().isEmpty()) && request.getAttachmentUrl() != null) {
            if ("IMAGE".equals(request.getAttachmentType())) {
                finalUserMessage = "Analise esta imagem.";
            } else {
                finalUserMessage = "Analise este documento.";
            }
        }

        // Add user message
        ChatMessageDTO userMsg = ChatMessageDTO.builder()
                .role("user")
                .content(finalUserMessage) // Message + extracted text
                .attachmentUrl(request.getAttachmentUrl())
                .attachmentType(request.getAttachmentType())
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
                // Pass imageUrl (can be null or Base64 data URI)
                aiResponse = openAiService.generateResponse(systemPrompt, finalUserMessage, imageUrl, history);

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

            if (lastException != null) {
                String excMessage = lastException.getMessage();
                log.error("Last exception details: {}", excMessage, lastException);
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
            if (chat.getTitle() == null || chat.getTitle().equals("Novo Chat") || chat.getTitle().trim().isEmpty()) {
                String titleCandidate = request.getMessage();
                if (titleCandidate == null || titleCandidate.trim().isEmpty()) {
                    // If user didn't type text, use the detailed message (which we populated with
                    // "Analise esta imagem" etc)
                    titleCandidate = finalUserMessage;
                }

                chat.setTitle(titleCandidate.length() > 30 ? titleCandidate.substring(0, 30) + "..."
                        : titleCandidate);
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

    // --- HELPER METHODS FOR ATTACHMENTS ---

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    private String processImageAttachment(String fileUrl) {
        try {
            // Check if it's already a Data URL (base64)
            if (fileUrl.startsWith("data:")) {
                return fileUrl;
            }

            byte[] fileContent = null;
            String mimeType = "image/jpeg";

            // Check if it's a remote URL (Supabase)
            if (fileUrl.startsWith("http")) {
                // Download and convert to Base64 to ensure OpenAI can see it
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
                // Fallback for local files
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
            // Return content as is if conversion fails (fallback)
            return fileUrl;
        }
    }

    private String extractDocumentContent(String fileUrl) {
        try {
            java.io.InputStream inputStream = null;

            if (fileUrl.startsWith("http")) {
                // Download from URL (Supabase)
                inputStream = new java.net.URL(fileUrl).openStream();
            } else {
                // Local file (fallback)
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
                    // Assume text-based (txt, csv, md)
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
