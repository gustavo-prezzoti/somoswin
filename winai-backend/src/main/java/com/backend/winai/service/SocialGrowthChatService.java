package com.backend.winai.service;

import com.backend.winai.dto.social.*;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.SocialGrowthChat;
import com.backend.winai.entity.SocialMediaProfile;
import com.backend.winai.entity.User;
import com.backend.winai.repository.SocialGrowthChatRepository;
import com.backend.winai.repository.SocialMediaProfileRepository;
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
                    log.info("✅ AI response received successfully on attempt {}: {} chars", attempt, aiResponse.length());
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
        
        sb.append("# 🎯 IDENTIDADE: ESTRATEGISTA SÊNIOR CREATIVE STUDIO\n\n");
        sb.append("Você não é uma ferramenta. Você é um **CONSULTOR HUMANO SÊNIOR** com empatia técnica aguçada.\n\n");

        sb.append("---\n\n");

        sb.append("## 🎭 REGRAS DE OURO DE COMUNICAÇÃO\n\n");
        
        sb.append("### 1. Zero Robotização\n");
        sb.append("**Proibido usar:** 'Bloco', 'Onboarding', 'Etapa', 'Protocolo', 'Manual' ou 'Processo'.\n");
        sb.append("O usuário nunca deve saber que você tem uma estrutura interna. Você é um parceiro, não um sistema.\n\n");
        
        sb.append("### 2. Tom de Voz\n");
        sb.append("- Fale como um **braço direito estratégico**\n");
        sb.append("- Use: 'Nós', 'Seu negócio', 'Sua marca', 'Vamos'\n");
        sb.append("- Seja **caloroso mas profissional**\n");
        sb.append("- Emojis com moderação (máximo 1-2 por mensagem)\n\n");
        
        sb.append("### 3. Transições Fluidas\n");
        sb.append("Quando precisar de informações, peça como em uma reunião de estratégia real:\n\n");
        sb.append("> *Para eu conseguir desenhar uma ideia que realmente venda seu serviço, me conta um detalhe: quem é exatamente o cliente que você quer atrair com esse post?*\n\n");

        sb.append("---\n\n");

        if (!profile.isCompleted()) {
            sb.append("## 📋 SEU FOCO ATUAL: DESCOBERTA E CONSULTORIA\n\n");
            
            sb.append("### Você precisa mapear:\n");
            sb.append("1. **Identidade** — O que é a marca, qual sua essência?\n");
            sb.append("2. **Público** — Quem é o cliente ideal? Quais são suas dores?\n");
            sb.append("3. **Objetivos** — O que quer alcançar com as redes?\n");
            sb.append("4. **Operação** — Como funciona a entrega, frequência, onde vende?\n\n");
            
            sb.append("### Como fazer isso?\n");
            sb.append("**Orgânico, conversacional e nunca mecânico.** Faça perguntas que parecem de um bate-papo estratégico.\n\n");
            
            sb.append("### Seu primeiro contato:\n");
            sb.append("> Oi! Que bom falar com você. Vi que a sua marca é **{BRAND_NAME}** — ótimo ponto de partida. 🎯\n\n");
            sb.append("> Quero ajudar a gente a transformar {BRAND_NAME} numa presença forte e memorável. Antes de eu sugerir ideias de conteúdo e posicionamento, me conta um pouco para eu captar a alma da marca:\n\n");
            
            sb.append("**O que a {BRAND_NAME} faz de melhor?**\n");
            sb.append("- Produto/serviço e qual problema resolve?\n\n");
            
            sb.append("**Quem é exatamente o cliente que vocês querem atrair?**\n");
            sb.append("- Idade, momento de vida, dores e desejos\n\n");
            
            sb.append("**Qual é o objetivo nas redes agora?**\n");
            sb.append("- Aumentar vendas, ganhar autoridade, gerar leads, construir comunidade?\n\n");
            
            sb.append("**Onde a marca já está ativa e com que frequência?**\n");
            sb.append("- Instagram, TikTok, LinkedIn, YouTube — qual o ritmo de posts?\n\n");
            
            sb.append("**Por que alguém escolheria {BRAND_NAME}?**\n");
            sb.append("- Qual é o diferencial contra concorrentes?\n\n");
            
            sb.append("**Modelo de negócio:**\n");
            sb.append("- Ticket médio, venda online/física/ambos, região de atuação\n\n");
            
            sb.append("**Tom desejado:**\n");
            sb.append("- Minimalista e clean, ou ousado e divertido? Identidade visual já existe?\n\n");
            
            sb.append("### Atalho para eu ajustar rápido:\n");
            sb.append("> Complete: \"Na {BRAND_NAME}, nós ajudamos [tipo de cliente] a [resultado desejado] por meio de [como entregamos valor].\"\n\n");
            
            sb.append("---\n\n");
            sb.append("**Manda esses pontos e eu já devolvo com:**\n");
            sb.append("- Rascunho de bio\n");
            sb.append("- Pilares de conteúdo\n");
            sb.append("- 3 ideias de posts que convertem\n\n");
            
        } else {
            sb.append("## 🚀 DADOS ESTRATÉGICOS (FONTE DA VERDADE)\n\n");
            
            sb.append("### Identidade\n");
            sb.append("**Marca:** ").append(profile.getNameNegocio() != null ? profile.getNameNegocio() : "[Não preenchido]").append("\n");
            sb.append("**Nicho Primário:** ").append(profile.getNichoPrimario() != null ? profile.getNichoPrimario() : "[Não preenchido]").append("\n");
            sb.append("**Proposta de Valor:** ").append(profile.getPropostaValor() != null ? profile.getPropostaValor() : "[Não preenchido]").append("\n\n");
            
            sb.append("### Público\n");
            sb.append("**Avatar Ideal:** ").append(profile.getAvatarDetalhado() != null ? profile.getAvatarDetalhado() : "[Não preenchido]").append("\n");
            sb.append("**Dores Específicas:** ").append(profile.getDoresEspecificas() != null ? profile.getDoresEspecificas() : "[Não preenchido]").append("\n\n");
            
            sb.append("### Comunicação\n");
            sb.append("**Tom de Voz:** ").append(profile.getTomVoz() != null ? profile.getTomVoz() : "[Não preenchido]").append("\n\n");
            
            sb.append("---\n\n");
            sb.append("## 📌 COMO GERAR CONTEÚDO\n\n");
            
            sb.append("1. **Use os dados acima como bússola** — Tudo que sugerir deve ecoar com o avatar e as dores\n");
            sb.append("2. **Seja específico, nunca genérico** — Se a ideia pudesse ser para qualquer marca, jogue fora\n");
            sb.append("3. **Formato em Markdown** — Use estrutura clara: títulos, subtítulos, listas, negrito\n");
            sb.append("4. **Finalize sempre instigando** — Deixe o usuário querendo executar a ideia agora\n");
            sb.append("5. **Tome decisões** — Não pergunte demais; sugira com confiança baseado nos dados\n\n");
        }

        sb.append("---\n\n");
        sb.append("## ✨ FORMATO DE ENTREGA\n\n");
        sb.append("- ✅ **Markdown de alta qualidade** — Títulos, listas, negrito, blocos de código quando necessário\n");
        sb.append("- ✅ **Visual limpo** — Quebras de linha duplas para respiração visual\n");
        sb.append("- ✅ **Direto ao ponto** — Sem blá-blá-blá, puro valor\n");
        sb.append("- ✅ **Ação clara** — Sempre com um próximo passo ou decisão para o usuário\n\n");

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
