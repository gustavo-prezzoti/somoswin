package com.backend.winai.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import com.backend.winai.dto.ai.AIContext;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.Lead;
import com.backend.winai.entity.Meeting;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.annotation.PostConstruct;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@Transactional(readOnly = true)
public class OpenAiService {

    @Value("${openai.api-key:${openai.api.key:}}")
    private String apiKey;

    @Value("${openai.model:gpt-5-mini}")
    private String model;

    @Value("${openai.model.vision:gpt-5-mini}")
    private String visionModel;

    @Value("${openai.reasoning-effort:medium}")
    private String reasoningEffort;

    @Value("${openai.max-tokens:1024}")
    private Integer maxTokens;

    @Value("${openai.enabled:true}")
    private Boolean enabled;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private String currentTextModel;
    private String currentVisionModel;

    @PostConstruct
    public void init() {
        this.currentTextModel = model;
        this.currentVisionModel = visionModel;
        if (enabled && apiKey != null && !apiKey.isEmpty() && !apiKey.startsWith("sk-your")) {
            log.info("=== OpenAI Service Initialized ===");
            log.info("Text Model: {} | Vision Model: {} | Enabled: {}", currentTextModel, currentVisionModel, enabled);
            log.warn("📌 Configured models verified.");
        } else {
            log.warn("OpenAI Service is disabled or API key is not configured");
        }
    }

    public boolean isChatEnabled() {
        return enabled && apiKey != null && !apiKey.isEmpty() && !apiKey.startsWith("sk-your");
    }

    public String generateResponse(String systemPrompt, String userMessage) {
        return generateResponse(systemPrompt, userMessage, null);
    }

    @SuppressWarnings("unchecked")
    public String generateResponse(String systemPrompt, String userMessage, List<ChatMessage> conversationHistory) {
        return generateResponse(systemPrompt, userMessage, null, conversationHistory);
    }

    /**
     * Analyzes the user's intent to determine if they are requesting a human agent.
     * Uses gpt-5-mini for speed and cost-efficiency.
     * NOT_SUPPORTED evita connection leak durante chamada HTTP à OpenAI.
     *
     * @param userMessage         The latest message from the user.
     * @param conversationHistory Recent conversation context.
     * @return "HANDOFF" if human intervention is needed, "CONTINUE" otherwise.
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public String analyzeIntent(String userMessage, List<ChatMessage> conversationHistory) {
        if (!isChatEnabled())
            return "CONTINUE";

        try {
            String systemPrompt = """
                    Você é um classificador de intenção para um chatbot de atendimento via WhatsApp.
                    Sua única tarefa é decidir se a mensagem do usuário requer transferência para atendente humano.
                    Responda APENAS com uma palavra: CONTINUE ou HANDOFF. Sem explicações, sem pontuação extra.

                    === HANDOFF (transferir para humano) ===
                    Retorne HANDOFF SOMENTE quando o usuário pedir EXPLICITAMENTE e de forma inequívoca falar com uma pessoa real.
                    Frases que indicam HANDOFF:
                    - "quero falar com um humano", "falar com atendente", "falar com pessoa"
                    - "me transfira para um humano", "transferir para atendente"
                    - "não quero falar com robô", "quero uma pessoa de verdade"
                    - "preciso de um atendente humano", "atendimento humano por favor"
                    - "cadê o humano?", "onde está o atendente?"
                    - Frustração explícita: "já pedi 3 vezes para falar com humano"

                    === CONTINUE (bot continua atendendo) ===
                    Retorne CONTINUE em TODOS os outros casos. Inclui:

                    Horários e datas (NUNCA é HANDOFF):
                    - "14h", "15h", "9h", "14:00", "às 10", "meio-dia"
                    - "segunda", "amanhã", "próxima semana", "dia 25"
                    - "2025-02-20", "20/02"

                    Confirmações e respostas curtas:
                    - "sim", "não", "ok", "tá bom", "pode ser", "claro"
                    - "entendi", "obrigado", "valeu", "beleza"

                    Agendamento e marcação:
                    - Qualquer resposta sobre horário disponível, data, confirmação de agendamento
                    - "quero agendar", "tem vaga?", "qual horário?", "pode ser às 14h"

                    Dúvidas e perguntas:
                    - Perguntas sobre produtos, serviços, preços, endereço
                    - "quanto custa?", "onde fica?", "como faço?"

                    Números e dados:
                    - CPF, telefone, valores, quantidades
                    - Respostas que são apenas números

                    Mensagens ambíguas ou curtas:
                    - Uma ou duas palavras sem contexto claro de pedido de humano
                    - Emoji sozinho, "kkk", "haha"

                    === COMPORTAMENTO DO SISTEMA ===
                    O sistema SEMPRE comunica ao lead. Nunca deixe o usuário sem resposta.
                    - HANDOFF: o sistema informa ao lead "Te transferi para um atendente humano" e faz a transferência.
                    - CONTINUE: o agente principal responde. Se a mensagem for confusa ou incompreensível, o agente dirá "Desculpe, não entendi. Pode repetir ou reformular?" em vez de inventar resposta.
                    - Em mensagens ambíguas que NÃO são pedido explícito de humano, retorne CONTINUE. O agente tratará e, se não entender, comunicará "não entendi" ao lead.
                    - Use HANDOFF apenas quando o usuário pedir EXPLICITAMENTE falar com humano.""";

            // Use lightweight model for classification
            String originalModel = this.currentTextModel;
            this.currentTextModel = "gpt-5-mini"; // Lightweight model for intent classification

            String result = generateResponse(systemPrompt, userMessage, null, conversationHistory);

            // Restore original model configuration
            this.currentTextModel = originalModel;

            if (result != null) {
                result = result.trim().toUpperCase();
                if (result.contains("HANDOFF"))
                    return "HANDOFF";
            }

            return "CONTINUE";

        } catch (Exception e) {
            log.warn("Intent analysis failed: {}", e.getMessage());
            return "CONTINUE"; // Fail safe to normal flow
        }
    }

    @SuppressWarnings("unchecked")
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public String generateResponse(String systemPrompt, String userMessage, String imageUrl,
            List<ChatMessage> conversationHistory) {
        if (!isChatEnabled()) {
            log.warn("OpenAI Chat Service is not enabled or not properly configured");
            return null;
        }

        try {
            List<Map<String, Object>> messages = new ArrayList<>();

            // System Message
            Map<String, Object> sysMsg = new HashMap<>();
            sysMsg.put("role", "system");
            sysMsg.put("content", systemPrompt);
            messages.add(sysMsg);

            // History
            if (conversationHistory != null) {
                for (ChatMessage msg : conversationHistory) {
                    Map<String, Object> histMsg = new HashMap<>();
                    histMsg.put("role", msg.getRole());
                    histMsg.put("content", msg.getContent());
                    messages.add(histMsg);
                }
            }

            // User Message
            Map<String, Object> userMsg = new HashMap<>();
            userMsg.put("role", "user");

            // Determine model logic
            String currentModel = (imageUrl != null && !imageUrl.isEmpty()) ? currentVisionModel : currentTextModel;

            if (imageUrl != null && !imageUrl.isEmpty()) {
                List<Map<String, Object>> contentList = new ArrayList<>();

                // Text
                Map<String, Object> textPart = new HashMap<>();
                textPart.put("type", "text");
                textPart.put("text", userMessage != null ? userMessage : "Analise esta imagem.");
                contentList.add(textPart);

                // Image
                Map<String, Object> imagePart = new HashMap<>();
                imagePart.put("type", "image_url");
                Map<String, String> urlMap = new HashMap<>();
                urlMap.put("url", imageUrl);
                imagePart.put("image_url", urlMap);
                contentList.add(imagePart);

                userMsg.put("content", contentList);
            } else {
                userMsg.put("content", userMessage);
            }
            messages.add(userMsg);

            // Request Body
            Map<String, Object> body = new HashMap<>();
            body.put("model", currentModel);
            body.put("messages", messages);
            body.put("max_completion_tokens", maxTokens);

            // GPT-5 reasoning parameters for consistent responses
            if (currentModel.startsWith("gpt-5")) {
                body.put("reasoning_effort", reasoningEffort);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            String url = "https://api.openai.com/v1/chat/completions";

            log.debug("📤 Sending request to OpenAI | Model: {} | Messages: {}", currentModel, messages.size());

            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            Map<String, Object> responseBody = response.getBody();

            if (responseBody == null) {
                log.error("❌ OpenAI returned NULL response body");
                return null;
            }

            // Log the full response for debugging
            log.debug("📥 OpenAI Raw Response: {}", responseBody);

            // Check for API errors
            if (responseBody.containsKey("error")) {
                Map<String, Object> error = (Map<String, Object>) responseBody.get("error");
                String errorType = (String) error.get("type");
                String errorMessage = (String) error.get("message");
                log.error("❌ OpenAI API Error [{}]: {}", errorType, errorMessage);

                // Check if it's a model authorization error
                if (errorMessage != null && (errorMessage.contains("does not exist") ||
                        errorMessage.contains("not available") ||
                        errorMessage.contains("not supported") ||
                        errorMessage.contains("access") ||
                        errorMessage.contains("unauthorized"))) {
                    log.error("🚨 MODEL ERROR DETECTED: '{}' | Error: {}", currentModel, errorMessage);
                }
                return null;
            }

            if (!responseBody.containsKey("choices")) {
                log.error("❌ OpenAI response missing 'choices' field. Full response: {}", responseBody);
                return null;
            }

            List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
            if (choices == null || choices.isEmpty()) {
                log.error("❌ OpenAI returned empty choices list");
                return null;
            }

            Map<String, Object> firstChoice = choices.get(0);
            if (firstChoice == null) {
                log.error("❌ First choice is null");
                return null;
            }

            Map<String, Object> messageObj = (Map<String, Object>) firstChoice.get("message");
            if (messageObj == null) {
                log.error("❌ Message object is null in first choice");
                return null;
            }

            String content = (String) messageObj.get("content");
            String refusal = (String) messageObj.get("refusal");

            log.debug("📊 Response Details | Content: {} chars | Refusal: {} | Full message: {}",
                    content != null ? content.length() : "null",
                    refusal,
                    messageObj);

            if (content == null || content.trim().isEmpty()) {
                log.warn("⚠️ OpenAI returned EMPTY content | Model: {} | Refusal: {} | Message obj: {}",
                        currentModel, refusal, messageObj);
                return null;
            }

            log.info("✅ OpenAI response successful | Model: {} | Content: {} chars", currentModel, content.length());
            return content;

        } catch (Exception e) {
            log.error("❌ Exception in generateResponse: {}", e.getMessage(), e);
            return null;
        }
    }

    public String generateResponseWithContext(String agentPrompt, String knowledgeBaseContent, String userMessage,
            List<ChatMessage> recentMessages) {
        return generateResponseWithContext(agentPrompt, knowledgeBaseContent, userMessage, null, recentMessages);
    }

    public String generateResponseWithContext(String agentPrompt, String knowledgeBaseContent, String userMessage,
            String imageUrl, List<ChatMessage> recentMessages) {
        return generateResponseWithContext(agentPrompt, knowledgeBaseContent, userMessage, imageUrl, recentMessages,
                null);
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public String generateResponseWithContext(String agentPrompt, String knowledgeBaseContent, String userMessage,
            String imageUrl, List<ChatMessage> recentMessages, AIContext aiContext) {
        StringBuilder systemPrompt = new StringBuilder();

        // === CONTEXTO TEMPORAL (Data, Hora Brasília, Dia da Semana) ===
        java.time.ZonedDateTime nowBrasilia = java.time.ZonedDateTime.now(java.time.ZoneId.of("America/Sao_Paulo"));
        String dataAtual = nowBrasilia.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        String horaAtual = nowBrasilia.format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"));
        String diaSemana = nowBrasilia.getDayOfWeek().getDisplayName(java.time.format.TextStyle.FULL,
                new java.util.Locale("pt", "BR"));
        // Capitalizar primeira letra
        diaSemana = diaSemana.substring(0, 1).toUpperCase() + diaSemana.substring(1);

        systemPrompt.append("=== CONTEXTO TEMPORAL ===\n");
        systemPrompt.append("Data atual: ").append(dataAtual).append("\n");
        systemPrompt.append("Horário atual (Brasília): ").append(horaAtual).append("\n");
        systemPrompt.append("Dia da semana: ").append(diaSemana).append("\n");
        systemPrompt.append(
                "Use essas informações para interpretar pedidos como 'amanhã', 'segunda-feira', 'próxima semana', etc.\n");
        systemPrompt.append("=========================\n\n");

        if (agentPrompt != null && !agentPrompt.isEmpty()) {
            systemPrompt.append(agentPrompt);
            systemPrompt.append("\n\n");
        } else {
            systemPrompt.append("Você é um assistente virtual inteligente e prestativo. ");
            systemPrompt.append(
                    "Use a base de conhecimento abaixo para responder às perguntas do usuário de forma clara, objetiva e amigável.\n\n");
        }

        if (knowledgeBaseContent != null && !knowledgeBaseContent.isEmpty()) {
            systemPrompt.append("=== BASE DE CONHECIMENTO ===\n");
            systemPrompt.append(knowledgeBaseContent);
            systemPrompt.append("\n=== FIM DA BASE ===\n\n");
        }

        systemPrompt.append("Instruções importantes:\n");
        systemPrompt.append("1. Responda APENAS com base nas informações da base de conhecimento quando possível.\n");
        systemPrompt.append(
                "2. Se não entender a mensagem do usuário (ambígua, incompleta, fora de contexto), responda: \"Desculpe, não entendi. Pode repetir ou reformular?\" NUNCA invente ou assuma o que o usuário quis dizer.\n");
        systemPrompt.append(
                "3. Se não souber a resposta sobre um tema, seja honesto e sugira que o usuário entre em contato com um atendente humano.\n");
        systemPrompt.append("4. Seja cordial, profissional e use linguagem natural.\n");
        systemPrompt.append("5. Mantenha respostas concisas e diretas (ideal para WhatsApp).\n");
        systemPrompt.append("6. Use emojis de forma moderada para tornar a conversa mais amigável.\n");
        systemPrompt.append("7. Nunca invente informações que não estejam na base de conhecimento.\n");
        systemPrompt.append(
                "8. Use a tag [SPLIT] para dividir mensagens longas em vários balões de conversa. Cada parte deve ser uma continuação direta sem repetir saudações ou introduções. O objetivo é um fluxo natural de mensagens sequenciais.\n");
        systemPrompt.append("9. REGRAS DE OURO PARA EVITAR REPETIÇÃO E SAUDAÇÕES:\n");
        systemPrompt.append(
                "   - Se houver histórico de conversa, NÃO comece com saudações (Olá, Oi, Tudo bem, etc.) nem reapresente o assistente.\n");
        systemPrompt.append(
                "   - NÃO repita informações que já foram ditas por você ou pelo usuário anteriormente na conversa.\n");
        systemPrompt.append("   - Vá direto ao ponto da dúvida atual.\n");
        systemPrompt.append("10. REGRAS PARA TRANSIÇÃO HUMANA:\n");
        systemPrompt.append(
                "   - SE o usuário pedir explicitamente para falar com um humano, use a ferramenta 'escalar_humano'.\n");
        systemPrompt.append(
                "   - Se você ver no histórico que o atendente já foi solicitado ou que a ferramenta 'escalar_humano' já foi chamada anteriormente, NÃO chame a ferramenta novamente. Simplesmente informe que o atendente já está a caminho.\n");
        systemPrompt.append(
                "   - Quando agendamento ESTÁ disponível: reagendar = listar_meus_agendamentos + buscar_horarios + criar_agendamento + cancelar_agendamento_google. Cancelar = cancelar_agendamento_google. NÃO escale para humano.\n");
        systemPrompt.append(
                "   - NÃO tente simular um humano ou mentir. Se for solicitado, mude para o modo humano imediatamente.\n");
        systemPrompt.append("11. REGRAS PARA MEMÓRIA (IMPORTANTE):\n");
        systemPrompt.append(
                "   - Se você perceber que um assunto foi CONCLUÍDO, FINALIZADO ou a conversa está encerrando (tchau, obrigado, resolvido), ADICIONE a tag [SUMMARY] no final da sua resposta.\n");
        systemPrompt.append(
                "   - A tag [SUMMARY] avisará o sistema para salvar as informações importantes desta conversa na memória de longo prazo.\n");

        if (aiContext != null && aiContext.getCompany() != null) {
            boolean agendamentoDisponivel = agendamentoService.isAgendamentoEnabledForCompany(aiContext.getCompany());
            if (agendamentoDisponivel) {
                systemPrompt.append("\n12. AGENDAMENTO DISPONÍVEL (Google Calendar):\n");
                systemPrompt.append(
                        "   - Você TEM capacidade de agendar. SOMENTE quando o usuário perguntar ou demonstrar interesse em agendar, marcar horário, agendar visita ou reunião: ofereça ajudar e use as ferramentas.\n");
                systemPrompt.append(
                        "   - NÃO force nem sugira agendamento sem necessidade. Só atue quando houver interesse explícito do usuário.\n");
                systemPrompt.append(
                        "   - Use 'listar_meus_agendamentos' quando o usuário perguntar sobre agendamentos, quiser reagendar ou cancelar.\n");
                systemPrompt.append(
                        "   - Reagendar: listar_meus_agendamentos -> buscar_horarios_disponiveis -> reagendar_agendamento (meeting_id do antigo + nova data/hora). Use SEMPRE reagendar_agendamento (cria novo e cancela antigo em uma chamada). NUNCA use criar_agendamento + cancelar separados.\n");
                systemPrompt.append(
                        "   - Cancelar: listar_meus_agendamentos -> cancelar_agendamento_google com o meeting_id. NUNCA escale para humano para cancelar.\n");
                systemPrompt.append(
                        "   - Novo agendamento: buscar_horarios_disponiveis -> criar_agendamento_google. Peça nome e e-mail (opcional). NUNCA escale para humano.\n");
                systemPrompt.append(
                        "   - Ofereça apenas 2-3 horários por vez. Telefone já vem do WhatsApp. NUNCA peça CPF.\n");
                systemPrompt.append(
                        "   - DADOS DO AGENDAMENTO: Use APENAS o que o cliente informou EXPLICITAMENTE. Nome: só o que o cliente disse. Observações: NUNCA inclua Pagamento, valor, CNPJ ou origem - deixe vazio se o cliente não informou.\n");
                systemPrompt.append(
                        "   - CRÍTICO: Se a ferramenta retornar 'Horários disponíveis:' com lista de slots, NUNCA diga 'não há horários'. Liste os horários. Só diga 'não há horários' quando retornar 'Nenhum horário disponível'.\n");
                systemPrompt.append(
                        "   - Quando o usuário disser manhã, tarde ou noite (ex: 'prefiro tarde', 'tem manhã?', 'horário de noite'), use o parâmetro preferencia em buscar_horarios_disponiveis.\n");
                systemPrompt.append(
                        "   - NÃO ofereça transferir para atendente quando puder fazer reagendar/cancelar/agendar você mesmo. Só transfira quando o usuário PEDIR explicitamente.\n");
                String configSummary = agendamentoService.getConfigSummaryForPrompt(aiContext.getCompany());
                if (configSummary != null && !configSummary.isEmpty()) {
                    systemPrompt.append("   - Regras da empresa: ").append(configSummary).append("\n");
                }
            } else {
                systemPrompt.append("\n12. AGENDAMENTO NÃO DISPONÍVEL - TRANSIÇÃO HUMANA:\n");
                systemPrompt.append(
                        "   - Você NÃO tem capacidade de agendar. Quando o usuário quiser agendar, marcar horário ou agendar visita: NÃO invente horários.\n");
                systemPrompt.append(
                        "   - Ofereça IMEDIATAMENTE transferir para um atendente humano: use a ferramenta 'escalar_humano' OU pergunte se deseja falar com um humano para agendar.\n");
                systemPrompt.append(
                        "   - Seja transparente: diga que um atendente pode ajudar com o agendamento e pergunte se deseja ser transferido.\n");
            }
        }

        List<Map<String, Object>> messages = new ArrayList<>();
        Map<String, Object> sysMsg = new HashMap<>();
        sysMsg.put("role", "system");
        sysMsg.put("content", systemPrompt.toString());
        messages.add(sysMsg);

        if (recentMessages != null) {
            for (ChatMessage msg : recentMessages) {
                Map<String, Object> histMsg = new HashMap<>();
                histMsg.put("role", msg.getRole());
                histMsg.put("content", msg.getContent());
                messages.add(histMsg);
            }
        }

        Map<String, Object> userMsg = new HashMap<>();
        userMsg.put("role", "user");
        userMsg.put("content", userMessage);
        messages.add(userMsg);

        List<Map<String, Object>> tools = getGlobalTools(aiContext);

        // Loop for Tool calling support (Max 3 turns for general flow)
        for (int turn = 0; turn < 3; turn++) {
            Map<String, Object> body = new HashMap<>();
            body.put("model", currentTextModel);
            body.put("messages", messages);
            body.put("tools", tools);

            // GPT-5 reasoning parameters for consistent responses
            if (currentTextModel.startsWith("gpt-5")) {
                body.put("reasoning_effort", reasoningEffort);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            try {
                ResponseEntity<Map> response = restTemplate.postForEntity("https://api.openai.com/v1/chat/completions",
                        entity, Map.class);
                Map<String, Object> responseBody = response.getBody();
                List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
                if (choices == null || choices.isEmpty())
                    return null;

                Map<String, Object> choice = choices.get(0);
                Map<String, Object> message = (Map<String, Object>) choice.get("message");
                messages.add(message);

                if (message.containsKey("tool_calls")) {
                    List<Map<String, Object>> toolCalls = (List<Map<String, Object>>) message.get("tool_calls");
                    for (Map<String, Object> toolCall : toolCalls) {
                        Map<String, Object> function = (Map<String, Object>) toolCall.get("function");
                        String functionName = (String) function.get("name");
                        String arguments = (String) function.get("arguments");
                        String toolCallId = (String) toolCall.get("id");

                        String result = executeGlobalTool(functionName, arguments, aiContext);
                        if ("HUMAN_HANDOFF_REQUESTED".equals(result)) {
                            return "HUMAN_HANDOFF_REQUESTED";
                        }

                        Map<String, Object> toolMsg = new HashMap<>();
                        toolMsg.put("role", "tool");
                        toolMsg.put("tool_call_id", toolCallId);
                        toolMsg.put("content", result != null ? result : "Ok");
                        messages.add(toolMsg);
                    }
                } else {
                    String content = (String) message.get("content");
                    return content != null ? content.replace("*", "") : null;
                }
            } catch (Exception e) {
                log.error("Erro na chamada OpenAI com ferramentas: {}", e.getMessage());
                break;
            }
        }

        return null;
    }

    @SuppressWarnings("unchecked")
    public List<Double> getEmbedding(String text) {
        if (apiKey == null || apiKey.isEmpty()) {
            throw new RuntimeException("OpenAI API Key não configurada");
        }

        String url = "https://api.openai.com/v1/embeddings";

        Map<String, Object> body = new HashMap<>();
        body.put("input", text);
        body.put("model", "text-embedding-3-small");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            Map<String, Object> responseBody = response.getBody();
            if (responseBody == null || !responseBody.containsKey("data")) {
                throw new RuntimeException("Resposta inválida da OpenAI: " + responseBody);
            }

            List<Map<String, Object>> data = (List<Map<String, Object>>) responseBody.get("data");
            if (data.isEmpty()) {
                throw new RuntimeException("Nenhum embedding retornado");
            }

            return (List<Double>) data.get(0).get("embedding");
        } catch (Exception e) {
            throw new RuntimeException("Erro ao gerar embedding: " + e.getMessage(), e);
        }
    }

    public String transcribeAudio(byte[] audioData, String filename) {
        if (!isChatEnabled())
            return null;

        try {
            // Salvar bytes em arquivo temporário
            java.io.File tempFile = java.io.File.createTempFile("audio_", "_" + filename);
            java.nio.file.Files.write(tempFile.toPath(), audioData);

            String url = "https://api.openai.com/v1/audio/transcriptions";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            headers.setBearerAuth(apiKey);

            org.springframework.util.MultiValueMap<String, Object> body = new org.springframework.util.LinkedMultiValueMap<>();
            body.add("file", new org.springframework.core.io.FileSystemResource(tempFile));
            body.add("model", "whisper-1");
            body.add("language", "pt");

            HttpEntity<org.springframework.util.MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body,
                    headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, requestEntity, Map.class);

            // Limpar arquivo temporário
            try {
                tempFile.delete();
            } catch (Exception ignored) {
            }

            if (response.getBody() != null && response.getBody().containsKey("text")) {
                String text = (String) response.getBody().get("text");
                log.info("Áudio transcrito: {}", text);
                return text;
            }

            return null;
        } catch (Exception e) {
            log.error("Erro ao transcrever áudio: {}", e.getMessage());
            return null;
        }
    }

    @org.springframework.beans.factory.annotation.Autowired
    private ChatMemoryService chatMemoryService;

    @org.springframework.beans.factory.annotation.Autowired
    private ClinicorpService clinicorpService;

    @org.springframework.beans.factory.annotation.Autowired
    private AgendamentoService agendamentoService;

    @SuppressWarnings("unchecked")
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public String generateClinicorpResponse(String userMessage, List<String> recentMessages, String contextInfo,
            String agentPrompt) {
        if (!isChatEnabled())
            return null;

        try {
            // Tenta extrair dados do contexto (assumindo que seja um JSON com os campos
            // necessários)
            String telefone = "";
            String nome_paciente = "";
            String paciente_id = "";
            String id_conversa = "";
            String subscriber_id = "clinicorp";

            try {
                JsonNode ctx = objectMapper.readTree(contextInfo);
                telefone = ctx.has("telefone") ? ctx.get("telefone").asText() : "";
                nome_paciente = ctx.has("nome_paciente") ? ctx.get("nome_paciente").asText() : "";
                paciente_id = ctx.has("paciente_id") ? ctx.get("paciente_id").asText() : "";
                id_conversa = ctx.has("id_conversa") ? ctx.get("id_conversa").asText() : "";
                subscriber_id = ctx.has("subscriber_id") ? ctx.get("subscriber_id").asText() : "clinicorp";
            } catch (Exception e) {
                log.debug("Contexto não é JSON ou incompleto: {}", contextInfo);
            }

            // --- REDIS INTEGRATION ---
            String memoryKey = (id_conversa != null && !id_conversa.isEmpty()) ? id_conversa : telefone;
            List<Map<String, Object>> messages = chatMemoryService.getMemory(memoryKey);

            // Persistência de Nome no Redis (Atende o pedido "chamar usuário pelo nome")
            if (nome_paciente != null && !nome_paciente.isEmpty()
                    && !"Não identificado".equalsIgnoreCase(nome_paciente)) {
                chatMemoryService.saveUserName(telefone, nome_paciente);
            } else {
                String savedName = chatMemoryService.getUserName(telefone);
                if (savedName != null) {
                    nome_paciente = savedName;
                }
            }

            // 1. System Prompt Construction - CONTEXTO TEMPORAL COM TIMEZONE BRASÍLIA
            java.time.ZonedDateTime nowBrasilia = java.time.ZonedDateTime.now(java.time.ZoneId.of("America/Sao_Paulo"));
            String dataAtual = nowBrasilia.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            String horaAtual = nowBrasilia.format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"));
            String diaSemana = nowBrasilia.getDayOfWeek().getDisplayName(java.time.format.TextStyle.FULL,
                    new java.util.Locale("pt", "BR"));
            diaSemana = diaSemana.substring(0, 1).toUpperCase() + diaSemana.substring(1);

            StringBuilder sysPrompt = new StringBuilder();

            // DADOS DINÂMICOS DO CONTEXTO (SEMPRE ACOMPANHAM O PROMPT)
            sysPrompt.append("=== CONTEXTO TEMPORAL ===\n");
            sysPrompt.append("Data atual: ").append(dataAtual).append("\n");
            sysPrompt.append("Horário atual (Brasília): ").append(horaAtual).append("\n");
            sysPrompt.append("Dia da semana: ").append(diaSemana).append("\n");
            sysPrompt.append(
                    "Use essas informações para interpretar pedidos como 'amanhã', 'segunda-feira', 'próxima semana', etc.\n");
            sysPrompt.append("=========================\n\n");
            sysPrompt.append("telefone: ").append(telefone).append("\n");
            sysPrompt.append("nome_paciente: ").append(nome_paciente).append("\n");
            sysPrompt.append("paciente_id_clinicorp: ").append(paciente_id).append("\n");
            sysPrompt.append("id_conversa: ").append(id_conversa).append("\n");
            sysPrompt.append("subscriber_id: ").append(subscriber_id).append("\n\n");

            // MANTÉM FIXO O PROMPT DA ÍSIS (Conforme pedido: Prompts dinâmicos apenas para
            // Growth/Social/Paid)
            sysPrompt.append("### 1. SUA IDENTIDADE (PERSONA)\n");
            sysPrompt.append("Você é a **Ísis**, Specialist da **Essenciallis**.\n");
            sysPrompt.append("* **Postura:** Extremamente concisa, resolutiva e amigável.\n");
            sysPrompt.append("* **Visual:** Use emojis com moderação (máximo 2 por resposta).\n\n");
            sysPrompt.append("---\n\n");
            sysPrompt.append("### 2. REGRAS DE OURO (MUITO IMPORTANTE)\n");
            sysPrompt.append(
                    "1. **CONCISÃO MÁXIMA:** Suas respostas devem ter no máximo 2 ou 3 linhas. Evite textos longos.\n");
            sysPrompt.append(
                    "2. **FOCO ÚNICO:** Não ofereça várias opções ou caminhos de uma vez. Foque no próximo passo lógico.\n");
            sysPrompt.append("3. **SEM LISTAS:** Evite bullet points para menus de opções. Seja natural.\n");
            sysPrompt.append(
                    "4. **VÁ DIRETO AO PONTO:** Evite empatia excessiva, saudações repetitivas ou enrolação.\n");
            sysPrompt.append(
                    "5. **DADOS:** Use a ferramenta `consultar_base_essenciallis` para dúvidas. Não invente.\n\n");
            sysPrompt.append("---\n\n");
            sysPrompt.append("### 3. REGRAS DE OURO DA AGENDA (TRAVA DE HORÁRIO)\n");
            sysPrompt.append("**ATENÇÃO MÁXIMA AQUI:**\n");
            sysPrompt.append("1. **HORÁRIO DE FUNCIONAMENTO RÍGIDO:** 09:00 às 19:00.\n");
            sysPrompt.append(
                    "2. **PROIBIÇÃO ABSOLUTA:** Você **NUNCA** pode oferecer horários antes das 09:00 ou depois das 19:00. Se a ferramenta retornar esses horários, IGNORE-OS.\n");
            sysPrompt.append(
                    "3. **SE NÃO HOUVER HORÁRIOS:** Não invente. Diga que vai verificar um encaixe ou ofereça outro dia.\n\n");
            sysPrompt.append("---\n\n");
            sysPrompt.append("### 4. MAPA DE FERRAMENTAS\n");
            sysPrompt.append("Use as ferramentas certas para cada situação:\n\n");
            sysPrompt.append("* `consultar_base_essenciallis`: Para ler sobre dúvidas técnicas/preços.\n");
            sysPrompt.append(
                    "* `Salvar_nome_paciente` + `Criar_paciente_clinicorp` + `Criar_agendamento_local`: Apenas para confirmar o agendamento.\n\n");

            sysPrompt.append("### 5. ROTEIRO (DIRETO AO PONTO)\n");
            sysPrompt.append("1. Se houver dúvida técnica: `consultar_base_essenciallis` + resposta curta.\n");
            sysPrompt.append(
                    "2. Se quer agendar: `Buscar_profissionais_disponiveis` + ofereça APENAS 2 horários.\n");
            sysPrompt.append("3. Se o tom for negativo ou pedir humano: `escalar_humano` + aviso curto.\n");
            sysPrompt.append("4. **NUNCA** mande saudações longas se a conversa já começou.\n\n");
            sysPrompt.append("---\n\n");
            sysPrompt.append("### 6. REGRAS VISUAIS\n");
            sysPrompt.append("1. **NÃO use negrito** (regra absoluta).\n");
            sysPrompt.append(
                    "2. **Quebras de linha:** Use apenas se a mensagem for realmente dividida em duas ideias.\n");
            sysPrompt.append("3. **Emojis:** Máximo de 2 por mensagem (🧡, ✨).\n\n");
            sysPrompt.append("**INSTRUÇÃO FINAL:**\n");
            sysPrompt.append("Seja breve. Menos é mais. Foque em fechar o agendamento ou tirar a dúvida sem enrolar. ");
            sysPrompt.append("Se precisar enviar mais de uma mensagem, use a tag [SPLIT] entre elas. ");
            sysPrompt.append(
                    "Cada balão deve ser continuação do anterior, sem repetir o 'Oi' ou apresentações em cada parte.");

            // Sempre injeta o agente específico e as tools de escala
            if (agentPrompt != null && !agentPrompt.trim().isEmpty()) {
                sysPrompt.append("\n\n---\n\n");
                sysPrompt.append("### INSTRUÇÕES ESPECÍFICAS DO CLIENTE (CUSTOM PROMPT)\n");
                sysPrompt.append(agentPrompt).append("\n\n");
            }

            sysPrompt.append("\n\n### FERRAMENTAS DE ESCALA (REGRAS CRÍTICAS)\n");
            sysPrompt.append(
                    "* `reagendar_atendimento`: **Use IMEDIATAMENTE** se o usuário quiser alterar, mudar, ajustar ou reagendar um horário.\n");
            sysPrompt.append(
                    "* `cancelar_atendimento`: **Use IMEDIATAMENTE** se o usuário quiser cancelar um agendamento.\n");
            sysPrompt.append("* `escalar_humano`: **Use IMEDIATAMENTE** se:\n");
            sysPrompt.append("    1. O cliente pedir para falar com humano/atendente.\n");
            sysPrompt.append("    2. O cliente estiver irritado.\n");
            sysPrompt.append("    3. Você não souber a resposta ou for um caso médico complexo.\n");
            sysPrompt.append(
                    "    * *Nota:* Ao usar essa tool, apenas avise o cliente e encerre. Você será pausada.\n\n");

            // Se a memória está vazia ou não tem System Prompt, inicializamos
            boolean hasSystem = messages.stream().anyMatch(m -> "system".equals(m.get("role")));
            if (!hasSystem) {
                Map<String, Object> sysMsg = new HashMap<>();
                sysMsg.put("role", "system");
                sysMsg.put("content", sysPrompt.toString());
                messages.add(0, sysMsg);
            }

            // Adiciona a nova mensagem do usuário
            Map<String, Object> userMsg = new HashMap<>();
            userMsg.put("role", "user");
            userMsg.put("content", userMessage);
            messages.add(userMsg);

            // 4. Tools Definition
            List<Map<String, Object>> tools = getClinicorpTools();

            // Loop for Tool calling support (Max 5 turns)
            for (int turn = 0; turn < 5; turn++) {

                Map<String, Object> body = new HashMap<>();
                body.put("model", currentTextModel); // Clinicorp uses text model
                body.put("messages", messages);
                body.put("tools", tools);

                // GPT-5 reasoning parameters for consistent responses
                if (currentTextModel.startsWith("gpt-5")) {
                    body.put("reasoning_effort", reasoningEffort);
                }

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.setBearerAuth(apiKey);

                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

                // Retry logic for OpenAI API (Max 3 retries)
                ResponseEntity<Map> response = null;
                Exception lastEx = null;
                for (int retry = 0; retry < 3; retry++) {
                    try {
                        response = restTemplate.postForEntity("https://api.openai.com/v1/chat/completions", entity,
                                Map.class);
                        break;
                    } catch (Exception e) {
                        log.warn("Erro ao chamar OpenAI (tentativa {}/3): {}", retry + 1, e.getMessage());
                        lastEx = e;
                        try {
                            Thread.sleep(1000 * (retry + 1));
                        } catch (InterruptedException ie) {
                        }
                    }
                }

                if (response == null || response.getBody() == null || !response.getBody().containsKey("choices")) {
                    log.error("OpenAI falhou após retentativas", lastEx);
                    return "Desculpe, tive um problema de conexão. Poderia repetir?";
                }

                Map<String, Object> responseBody = response.getBody();
                List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
                if (choices.isEmpty())
                    return null;

                Map<String, Object> choice = choices.get(0);
                Map<String, Object> message = (Map<String, Object>) choice.get("message");

                // Add assistant response to history
                messages.add(message);

                // Check for tool calls
                if (message.containsKey("tool_calls")) {
                    List<Map<String, Object>> toolCalls = (List<Map<String, Object>>) message.get("tool_calls");

                    for (Map<String, Object> toolCall : toolCalls) {
                        Map<String, Object> function = (Map<String, Object>) toolCall.get("function");
                        String functionName = (String) function.get("name");
                        String arguments = (String) function.get("arguments");
                        String toolCallId = (String) toolCall.get("id");

                        // Utiliza o id_conversa ou telefone como identificador para Redis
                        String result = executeClinicorpTool(functionName, arguments, memoryKey, telefone);

                        // If tool requested handoff, stop everything and return token
                        if ("HUMAN_HANDOFF_REQUESTED".equals(result)) {
                            return "HUMAN_HANDOFF_REQUESTED";
                        }

                        Map<String, Object> toolMsg = new HashMap<>();
                        toolMsg.put("role", "tool");
                        toolMsg.put("tool_call_id", toolCallId);
                        toolMsg.put("content", result);
                        messages.add(toolMsg);
                    }
                    // Continue loop to send tool outputs back to model
                } else {
                    // Final text response
                    String content = (String) message.get("content");
                    if (content != null) {
                        // Remove asteriscos (regra ZERO NEGRITO)
                        content = content.replace("*", "");

                        // --- REDIS PERSISTENCE ---
                        chatMemoryService.saveMemory(memoryKey, messages);

                        return content;
                    }
                    return null;
                }
            }
            return null; // Loop limit reached

        } catch (

        Exception e) {
            log.error("Error in Clinicorp flow", e);
            return "Desculpe, ocorreu um erro no sistema. Vou chamar um atendente.";
        }
    }

    private String executeClinicorpTool(String functionName, String jsonArgs, String conversationId,
            String phoneNumber) {
        try {
            JsonNode args = objectMapper.readTree(jsonArgs);
            log.info("Executando ferramenta Clinicorp: {} com argumentos: {}", functionName, jsonArgs);

            if ("consultar_base_essenciallis".equals(functionName)) {
                String query = args.has("query") ? args.get("query").asText() : "";
                return clinicorpService.searchKnowledgeBase(query);
            }
            if ("Buscar_profissionais_disponiveis".equalsIgnoreCase(functionName)) {
                java.time.LocalDate data = java.time.LocalDate.now();
                int dias = 3; // Default
                if (args.has("data")) {
                    try {
                        data = java.time.LocalDate.parse(args.get("data").asText());
                    } catch (Exception e) {
                        log.warn("Formato de data inválido: {}", args.get("data").asText());
                    }
                }
                if (args.has("dias")) {
                    dias = args.get("dias").asInt();
                }
                List<String> slots = clinicorpService.getAvailableSlots(data, dias);
                return slots.isEmpty() ? "Nenhum horário disponível nos próximos " + dias + " dias."
                        : "Horários encontrados nos próximos " + dias + " dias:\n" + String.join(", ", slots);
            }
            if ("buscar_meus_agendamentos".equalsIgnoreCase(functionName)) {
                String telefone = args.has("telefone") ? args.get("telefone").asText() : phoneNumber;
                List<Map<String, Object>> agendamentos = clinicorpService.getAppointmentsByPhone(telefone);
                if (agendamentos.isEmpty())
                    return "Você não possui agendamentos marcados.";

                StringBuilder sb = new StringBuilder("Seus agendamentos encontrados:\n");
                for (Map<String, Object> a : agendamentos) {
                    sb.append("- ID: ").append(a.get("id"))
                            .append(" | Data: ").append(a.get("data"))
                            .append(" às ").append(a.get("hora_inicio"))
                            .append(" (Status: ").append(a.get("status")).append(")\n");
                }
                return sb.toString();
            }
            if ("confirmar_agendamento".equalsIgnoreCase(functionName)) {
                String id = args.has("id") ? args.get("id").asText() : "";
                boolean ok = clinicorpService.confirmAppointment(id);
                return ok ? "Agendamento confirmado com sucesso!" : "Não foi possível confirmar o agendamento.";
            }
            if ("cancelar_agendamento".equalsIgnoreCase(functionName)) {
                String id = args.has("id") ? args.get("id").asText() : "";
                boolean ok = clinicorpService.cancelAppointmentLocal(id);
                return ok ? "Agendamento cancelado com sucesso!" : "Não foi possível cancelar o agendamento.";
            }
            if ("Salvar_nome_paciente".equalsIgnoreCase(functionName)) {
                String nome = args.has("nome") ? args.get("nome").asText() : "";
                String telefone = args.has("telefone") ? args.get("telefone").asText() : phoneNumber;

                // Salva no Redis e também na API
                chatMemoryService.saveUserName(telefone, nome);
                boolean ok = clinicorpService.savePatientName(nome, telefone);
                return ok ? "Nome salvo com sucesso!" : "Erro ao salvar nome.";
            }
            if ("Criar_paciente_clinicorp".equalsIgnoreCase(functionName)) {
                String nome = args.has("nome") ? args.get("nome").asText() : "";
                String telefone = args.has("telefone") ? args.get("telefone").asText() : phoneNumber;
                boolean ok = clinicorpService.createPatient(nome, telefone);
                return ok ? "Paciente criado/identificado com sucesso no Clinicorp." : "Erro ao sincronizar paciente.";
            }
            if ("Criar_agendamento_local".equalsIgnoreCase(functionName)) {
                // EVITAR DUPLICIDADE: Check lock in Redis
                if (chatMemoryService.isLocked(conversationId, "booking")) {
                    return "Erro: Agendamento já realizado nesta sessão para evitar duplicidade.";
                }

                String nome = args.has("nome_paciente") ? args.get("nome_paciente").asText() : "";
                String telefone = args.has("telefone") ? args.get("telefone").asText() : phoneNumber;
                String data = args.has("data") ? args.get("data").asText() : "";
                String hora = args.has("hora") ? args.get("hora").asText() : "";

                boolean ok = clinicorpService.createAppointment(nome, telefone, data, hora);
                if (ok) {
                    // Lock for 5 minutes to prevent accidental duplicate bookings
                    chatMemoryService.setLock(conversationId, "booking", 300);
                    return "Agendamento realizado com sucesso para " + data + " às " + hora + "!";
                }
                return "Erro ao realizar agendamento.";
            }
            String result = executeGlobalTool(functionName, jsonArgs, null);
            if (result != null) {
                return result;
            }
            return "Ferramenta desconhecida";
        } catch (Exception e) {
            log.error("Erro ao executar ferramenta Clinicorp: {}", functionName, e);
            return "Erro ao executar ferramenta: " + e.getMessage();
        }
    }

    private List<Map<String, Object>> getClinicorpTools() {
        List<Map<String, Object>> tools = new ArrayList<>();

        // Tool: consultar_base_essenciallis
        tools.add(createTool("consultar_base_essenciallis",
                "Consulta a base de conhecimento sobre preços, procedimentos e dúvidas técnicas.",
                Map.of("query", Map.of("type", "string", "description", "A dúvida ou termo para pesquisar."))));

        // Tool: Buscar_profissionais_disponiveis
        tools.add(createTool("Buscar_profissionais_disponiveis", "Busca horários disponíveis para agendamento.",
                Map.of(
                        "data", Map.of("type", "string", "description", "Data opcional no formato YYYY-MM-DD."),
                        "dias", Map.of("type", "integer", "description",
                                "Número de dias para buscar a partir da data (padrão: 3)."))));

        // Tool: buscar_meus_agendamentos
        tools.add(createTool("buscar_meus_agendamentos",
                "Busca todos os agendamentos marcados para o telefone do cliente.",
                Map.of("telefone", Map.of("type", "string", "description", "Telefone do cliente."))));

        // Tool: Salvar_nome_paciente
        tools.add(createTool("Salvar_nome_paciente", "Salva o nome do paciente associado ao telefone.",
                Map.of(
                        "nome", Map.of("type", "string", "description", "Nome completo."),
                        "telefone", Map.of("type", "string", "description", "Telefone."))));

        // Tool: Criar_paciente_clinicorp
        tools.add(createTool("Criar_paciente_clinicorp", "Sincroniza o paciente com o sistema Clinicorp.",
                Map.of(
                        "nome", Map.of("type", "string", "description", "Nome do paciente."),
                        "telefone", Map.of("type", "string", "description", "Telefone."))));

        // Tool: Criar_agendamento_local
        tools.add(createTool("Criar_agendamento_local", "Realiza o agendamento final no sistema.",
                Map.of(
                        "nome_paciente", Map.of("type", "string", "description", "Nome do paciente."),
                        "telefone", Map.of("type", "string", "description", "Telefone."),
                        "data", Map.of("type", "string", "description", "Data YYYY-MM-DD."),
                        "hora", Map.of("type", "string", "description", "Hora HH:MM."))));

        // Add Global Tools
        tools.addAll(getGlobalTools(null));

        return tools;
    }

    private List<Map<String, Object>> getGlobalTools(AIContext aiContext) {
        List<Map<String, Object>> tools = new ArrayList<>();

        // Tool: escalar_humano (só quando usuário PEDIR EXPLICITAMENTE humano)
        tools.add(createTool("escalar_humano", "Chama um atendente humano. Use SOMENTE quando o usuário pedir explicitamente para falar com um humano, atendente ou pessoa.",
                new HashMap<>()));

        boolean agendamentoDisponivel = aiContext != null && aiContext.getCompany() != null
                && agendamentoService.isAgendamentoEnabledForCompany(aiContext.getCompany());

        if (agendamentoDisponivel) {
            tools.add(createTool("listar_meus_agendamentos",
                    "Lista os agendamentos futuros do lead. Use quando o usuário perguntar sobre seus agendamentos, quiser reagendar ou cancelar.",
                    new HashMap<>()));
            tools.add(createTool("buscar_horarios_disponiveis",
                    "Busca horários disponíveis no Google Calendar. Se o usuário disser manhã, tarde ou noite, use preferencia para filtrar. manha=06-12h, tarde=12-18h, noite=18-22h.",
                    Map.of(
                            "data", Map.of("type", "string", "description", "Data no formato YYYY-MM-DD (opcional, padrão: hoje)."),
                            "dias", Map.of("type", "integer", "description", "Número de dias para buscar (padrão: 7)."),
                            "preferencia", Map.of("type", "string", "description", "Período: manha, tarde ou noite (quando o usuário disser 'prefiro manhã', 'tem tarde?', 'horário de noite', etc).")),
                    List.of()));
            tools.add(createTool("criar_agendamento_google",
                    "Cria agendamento no Google Calendar. Use data e hora de um slot retornado por buscar_horarios_disponiveis. Formato: data=YYYY-MM-DD, hora=HH:mm. Telefone vem do WhatsApp automaticamente. E-mail é OPCIONAL. Use APENAS dados que o cliente informou explicitamente - NUNCA invente nome, pagamento, CNPJ ou valor.",
                    Map.of(
                            "nome", Map.of("type", "string", "description", "Nome que o cliente informou explicitamente. NUNCA use nomes de memória ou contexto."),
                            "email", Map.of("type", "string", "description", "Email do lead (opcional - se não tiver, deixe vazio)."),
                            "telefone", Map.of("type", "string", "description", "Telefone (opcional - já temos do WhatsApp)."),
                            "data", Map.of("type", "string", "description", "Data no formato YYYY-MM-DD (ex: 2025-02-19)."),
                            "hora", Map.of("type", "string", "description", "Hora no formato HH:mm (ex: 09:00 ou 14:30)."),
                            "titulo", Map.of("type", "string", "description", "Título do agendamento (opcional)."),
                            "observacoes", Map.of("type", "string", "description", "Só o que o cliente disse. NUNCA inclua Pagamento, valor, CNPJ ou origem.")),
                    List.of("nome", "data", "hora")));
            tools.add(createTool("reagendar_agendamento",
                    "REAGENDA em uma única operação: cria o novo agendamento e cancela o antigo. Use quando o usuário quiser alterar data/hora. OBRIGATÓRIO: meeting_id do agendamento atual (listar_meus_agendamentos) + data e hora do novo slot.",
                    Map.of(
                            "meeting_id", Map.of("type", "string", "description", "UUID do agendamento atual a ser substituído (de listar_meus_agendamentos)."),
                            "nome", Map.of("type", "string", "description", "Nome do cliente (do agendamento atual ou informado)."),
                            "email", Map.of("type", "string", "description", "Email (opcional)."),
                            "data", Map.of("type", "string", "description", "Nova data YYYY-MM-DD."),
                            "hora", Map.of("type", "string", "description", "Nova hora HH:mm."),
                            "titulo", Map.of("type", "string", "description", "Título (opcional)."),
                            "observacoes", Map.of("type", "string", "description", "Observações (opcional).")),
                    List.of("meeting_id", "nome", "data", "hora")));
            tools.add(createTool("cancelar_agendamento_google",
                    "Cancela um agendamento. Use o meeting_id retornado por listar_meus_agendamentos (campo 'meeting_id:'). NÃO escale para humano - use esta ferramenta.",
                    Map.of("meeting_id", Map.of("type", "string", "description", "UUID exato do agendamento (ex: 550e8400-e29b-41d4-a716-446655440000).")),
                    List.of("meeting_id")));
        } else {
            // Sem agendamento: reagendar/cancelar só via humano
            tools.add(createTool("reagendar_atendimento", "Escala para humano para reagendar. Use SOMENTE quando agendamento NÃO está disponível.",
                    new HashMap<>()));
            tools.add(createTool("cancelar_atendimento", "Escala para humano para cancelar. Use SOMENTE quando agendamento NÃO está disponível.",
                    new HashMap<>()));
        }

        return tools;
    }

    private String executeGlobalTool(String functionName, String jsonArgs, AIContext aiContext) {
        if ("escalar_humano".equalsIgnoreCase(functionName) ||
                "reagendar_atendimento".equalsIgnoreCase(functionName) ||
                "cancelar_atendimento".equalsIgnoreCase(functionName)) {
            return "HUMAN_HANDOFF_REQUESTED";
        }
        if (aiContext != null && aiContext.getCompany() != null) {
            if ("listar_meus_agendamentos".equalsIgnoreCase(functionName)) {
                try {
                    List<Meeting> meetings = agendamentoService.listUpcomingMeetingsForLead(
                            aiContext.getCompany(), aiContext.getLead(), aiContext.getPhoneNumber());
                    if (meetings.isEmpty())
                        return "Nenhum agendamento futuro encontrado.";
                    StringBuilder sb = new StringBuilder("Agendamentos futuros (use meeting_id para cancelar ou reagendar):\n");
                    for (Meeting m : meetings) {
                        sb.append("- meeting_id: ").append(m.getId()).append(" | ")
                                .append(m.getMeetingDate().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                                .append(" às ").append(m.getMeetingTime().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")))
                                .append(" | nome: ").append(m.getContactName() != null ? m.getContactName() : "N/A")
                                .append(" | ").append(m.getTitle());
                        if (m.getNotes() != null && !m.getNotes().isEmpty())
                            sb.append(" (obs: ").append(m.getNotes()).append(")");
                        sb.append("\n");
                    }
                    return sb.toString();
                } catch (Exception e) {
                    log.error("Erro ao listar agendamentos", e);
                    return "Erro ao listar agendamentos.";
                }
            }
            if ("reagendar_agendamento".equalsIgnoreCase(functionName)) {
                try {
                    JsonNode args = objectMapper.readTree(jsonArgs);
                    String meetingIdStr = args.has("meeting_id") ? args.get("meeting_id").asText().trim() : "";
                    String nome = args.has("nome") ? args.get("nome").asText().trim() : "";
                    String email = args.has("email") ? args.get("email").asText().trim() : "";
                    String telefone = args.has("telefone") && !args.get("telefone").asText().trim().isEmpty()
                            ? args.get("telefone").asText().trim() : (aiContext.getPhoneNumber() != null ? aiContext.getPhoneNumber() : "");
                    String dataRaw = args.has("data") ? args.get("data").asText().trim() : "";
                    String horaRaw = args.has("hora") ? args.get("hora").asText().trim() : "";
                    String titulo = args.has("titulo") ? args.get("titulo").asText().trim() : "";
                    String observacoes = args.has("observacoes") ? args.get("observacoes").asText().trim() : "";
                    if (meetingIdStr.isEmpty() || nome.isEmpty() || dataRaw.isEmpty() || horaRaw.isEmpty())
                        return "Erro: meeting_id, nome, data e hora são obrigatórios para reagendar.";
                    meetingIdStr = extractUuid(meetingIdStr);
                    if (meetingIdStr == null)
                        return "Erro: meeting_id inválido. Use o UUID exato da listagem.";
                    String hora = horaRaw;
                    if (hora.matches("^\\d:[0-5]\\d$")) hora = "0" + hora;
                    return agendamentoService.rescheduleMeeting(aiContext.getCompany(), aiContext.getLead(),
                            java.util.UUID.fromString(meetingIdStr), nome, email, telefone, dataRaw, hora, titulo, observacoes);
                } catch (Exception e) {
                    log.error("Erro ao reagendar", e);
                    return "Erro ao reagendar: " + e.getMessage();
                }
            }
            if ("cancelar_agendamento_google".equalsIgnoreCase(functionName)) {
                try {
                    JsonNode args = objectMapper.readTree(jsonArgs);
                    String idStr = args.has("meeting_id") ? args.get("meeting_id").asText().trim() : "";
                    if (idStr.isEmpty())
                        return "Erro: meeting_id é obrigatório.";
                    idStr = extractUuid(idStr);
                    if (idStr == null)
                        return "Erro: meeting_id inválido. Use o UUID exato (ex: 550e8400-e29b-41d4-a716-446655440000).";
                    return agendamentoService.cancelMeeting(aiContext.getCompany(), java.util.UUID.fromString(idStr));
                } catch (Exception e) {
                    log.error("Erro ao cancelar agendamento", e);
                    return "Erro ao cancelar: " + e.getMessage();
                }
            }
            if ("buscar_horarios_disponiveis".equalsIgnoreCase(functionName)) {
                try {
                    JsonNode args = objectMapper.readTree(jsonArgs);
                    java.time.LocalDate data = java.time.LocalDate.now();
                    int dias = 7;
                    String preferencia = null;
                    if (args.has("data") && !args.get("data").asText().isEmpty()) {
                        data = java.time.LocalDate.parse(args.get("data").asText());
                    }
                    if (args.has("dias")) {
                        dias = args.get("dias").asInt();
                    }
                    if (args.has("preferencia") && !args.get("preferencia").asText().trim().isEmpty()) {
                        String p = args.get("preferencia").asText().trim().toLowerCase();
                        if (p.startsWith("manh")) p = "manha";
                        else if (p.startsWith("tard")) p = "tarde";
                        else if (p.startsWith("noit")) p = "noite";
                        preferencia = p;
                    }
                    List<String> slots = agendamentoService.getAvailableSlotsForDays(aiContext.getCompany(), data, dias, preferencia);
                    if (slots.isEmpty() && preferencia != null) {
                        List<String> slotsGeral = agendamentoService.getAvailableSlotsForDays(aiContext.getCompany(), data, dias, null);
                        if (!slotsGeral.isEmpty()) {
                            String display = agendamentoService.formatSlotsForDisplay(slotsGeral);
                            return "Não há horários no período da " + preferencia + ", mas há em outros horários:\n" + display
                                    + "\n\nSlots para agendar (data=YYYY-MM-DD, hora=HH:mm): " + String.join(", ", slotsGeral);
                        }
                    }
                    if (slots.isEmpty()) {
                        String periodo = preferencia != null ? " no período da " + preferencia : "";
                        return "Nenhum horário disponível nos próximos " + dias + " dias" + periodo + ".";
                    }
                    String display = agendamentoService.formatSlotsForDisplay(slots);
                    return "Horários disponíveis (máx 2 por dia):\n" + display
                            + "\n\nSlots para agendar (data=YYYY-MM-DD, hora=HH:mm): " + String.join(", ", slots);
                } catch (Exception e) {
                    log.error("Erro ao buscar horários", e);
                    return "Erro ao buscar horários disponíveis.";
                }
            }
            if ("criar_agendamento_google".equalsIgnoreCase(functionName)) {
                try {
                    JsonNode args = objectMapper.readTree(jsonArgs);
                    String nome = args.has("nome") ? args.get("nome").asText().trim() : "";
                    String email = args.has("email") ? args.get("email").asText().trim() : "";
                    String telefone = args.has("telefone") ? args.get("telefone").asText().trim()
                            : (aiContext.getPhoneNumber() != null ? aiContext.getPhoneNumber() : "");
                    String dataRaw = args.has("data") ? args.get("data").asText().trim() : "";
                    String horaRaw = args.has("hora") ? args.get("hora").asText().trim() : "";
                    String titulo = args.has("titulo") ? args.get("titulo").asText().trim() : "";
                    String observacoes = args.has("observacoes") ? args.get("observacoes").asText().trim() : "";
                    if (nome.isEmpty() || dataRaw.isEmpty() || horaRaw.isEmpty()) {
                        return "Erro: nome, data e hora são obrigatórios para agendar. E-mail é opcional.";
                    }
                    String data = dataRaw;
                    String hora = horaRaw;
                    // Normaliza hora: 9:00 -> 09:00 (LocalTime.parse exige HH:mm)
                    if (hora.matches("^\\d:[0-5]\\d$")) {
                        hora = "0" + hora;
                    }
                    return agendamentoService.createAppointment(aiContext.getCompany(), aiContext.getLead(), nome,
                            email, telefone, data, hora, titulo, observacoes);
                } catch (Exception e) {
                    log.error("Erro ao criar agendamento", e);
                    return "Erro ao criar agendamento: " + e.getMessage();
                }
            }
        }
        return null;
    }

    private static String extractUuid(String s) {
        if (s == null || s.isEmpty()) return null;
        s = s.trim();
        java.util.regex.Pattern p = java.util.regex.Pattern.compile("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}");
        java.util.regex.Matcher m = p.matcher(s);
        return m.find() ? m.group() : null;
    }

    private Map<String, Object> createTool(String name, String description, Map<String, Object> properties) {
        return createTool(name, description, properties,
                properties.isEmpty() ? List.of() : new ArrayList<>(properties.keySet()));
    }

    private Map<String, Object> createTool(String name, String description, Map<String, Object> properties,
            List<String> required) {
        Map<String, Object> tool = new HashMap<>();
        tool.put("type", "function");
        Map<String, Object> func = new HashMap<>();
        func.put("name", name);
        func.put("description", description);
        Map<String, Object> params = new HashMap<>();
        params.put("type", "object");
        params.put("properties", properties);
        if (!required.isEmpty()) {
            params.put("required", required);
        }
        func.put("parameters", params);
        tool.put("function", func);
        return tool;
    }

    // Inner DTO to replace external library dependency
    public String summarizeConversationContext(String currentSummary, List<ChatMessage> recentMessages) {
        if (!isChatEnabled() || recentMessages == null || recentMessages.isEmpty()) {
            return currentSummary;
        }

        try {
            StringBuilder prompt = new StringBuilder();
            prompt.append("Você é um especialista em sumarização de contexto para assistentes de IA.\n");
            prompt.append("Seu objetivo é criar ou atualizar um RESUMO CONCISO mas RICO sobre o usuário (Lead).\n\n");

            if (currentSummary != null && !currentSummary.isEmpty()) {
                prompt.append("=== RESUMO EXISTENTE ===\n");
                prompt.append(currentSummary).append("\n");
                prompt.append("========================\n\n");
            } else {
                prompt.append("=== NENHUM RESUMO EXISTENTE ===\n\n");
            }

            prompt.append("=== MENSAGENS RECENTES ===\n");
            for (ChatMessage msg : recentMessages) {
                prompt.append(msg.getRole()).append(": ").append(msg.getContent()).append("\n");
            }
            prompt.append("==========================\n\n");

            prompt.append("INSTRUÇÕES:\n");
            prompt.append("1. Atualize o resumo com informações novas das mensagens recentes.\n");
            prompt.append(
                    "2. Mantenha informações cruciais: Nome do usuário, preferências, intenção atual, status, detalhes pessoais.\n");
            prompt.append("3. Se o nome do usuário foi mencionado, DESTAQUE isso claramente.\n");
            prompt.append("4. Remova detalhes triviais ou conversas antigas irrelevantes.\n");
            prompt.append(
                    "5. O resumo deve ser em texto corrido ou tópicos, pronto para ser injetado no System Prompt numa próxima conversa.\n");
            prompt.append(
                    "6. Se o usuário mudou de assunto, atualize o contexto para o novo tópico mantendo dados perfil.\n");
            prompt.append("7. MÁXIMO de 1000 caracteres.\n");

            String updatedSummary = generateResponse(prompt.toString(),
                    "Atualize o resumo com base nas mensagens acima.");
            return updatedSummary != null ? updatedSummary : currentSummary;

        } catch (Exception e) {
            log.error("Erro ao gerar resumo de conversa: {}", e.getMessage());
            return currentSummary;
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatMessage {
        private String role;
        private String content;
    }
}
