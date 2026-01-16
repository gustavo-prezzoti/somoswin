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
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.annotation.PostConstruct;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class OpenAiService {

    @Value("${openai.api-key:${openai.api.key:}}")
    private String apiKey;

    @Value("${openai.model:gpt-4o}")
    private String model;

    @Value("${openai.temperature:0.7}")
    private Double temperature;

    @Value("${openai.max-tokens:1024}")
    private Integer maxTokens;

    @Value("${openai.enabled:true}")
    private Boolean enabled;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Fallback models if primary model fails
    private static final String[] FALLBACK_MODELS = { "gpt-4o", "gpt-4-turbo", "gpt-4o-mini", "gpt-4" };
    private String currentModel;

    @PostConstruct
    public void init() {
        this.currentModel = model;
        if (enabled && apiKey != null && !apiKey.isEmpty() && !apiKey.startsWith("sk-your")) {
            log.info("=== OpenAI Service Initialized ===");
            log.info("Model: {} | Enabled: {} | Max Tokens: {}", model, enabled, maxTokens);
            log.warn("❌ IMPORTANT: If you're using GPT-5, ensure your API key has access to it.");
            log.warn("📌 Configured model: '{}' - Verify this model exists in OpenAI API.", model);
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
        if (!isChatEnabled()) {
            log.warn("OpenAI Chat Service is not enabled or not properly configured");
            return null;
        }

        try {
            List<Map<String, String>> messages = new ArrayList<>();

            // System Message
            Map<String, String> sysMsg = new HashMap<>();
            sysMsg.put("role", "system");
            sysMsg.put("content", systemPrompt);
            messages.add(sysMsg);

            // History
            if (conversationHistory != null) {
                for (ChatMessage msg : conversationHistory) {
                    Map<String, String> histMsg = new HashMap<>();
                    histMsg.put("role", msg.getRole());
                    histMsg.put("content", msg.getContent());
                    messages.add(histMsg);
                }
            }

            // User Message
            Map<String, String> userMsg = new HashMap<>();
            userMsg.put("role", "user");
            userMsg.put("content", userMessage);
            messages.add(userMsg);

            // Request Body
            Map<String, Object> body = new HashMap<>();
            body.put("model", currentModel);
            body.put("messages", messages);
            body.put("max_completion_tokens", maxTokens);

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
                    log.warn("⚠️ Attempting fallback to alternative models...");
                    return tryFallbackModels(systemPrompt, userMessage, conversationHistory, currentModel);
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
                // Try fallback if content is empty but no explicit error
                if (refusal == null) {
                    log.warn("📌 Content is empty but no refusal - trying fallback models");
                    return tryFallbackModels(systemPrompt, userMessage, conversationHistory, currentModel);
                }
                return null;
            }

            log.info("✅ OpenAI response successful | Model: {} | Content: {} chars", currentModel, content.length());
            return content;

        } catch (Exception e) {
            log.error("❌ Exception in generateResponse: {}", e.getMessage(), e);
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private String tryFallbackModels(String systemPrompt, String userMessage,
            List<ChatMessage> conversationHistory, String failedModel) {
        log.warn("🔄 Trying fallback models after failure with: {}", failedModel);

        for (String fallbackModel : FALLBACK_MODELS) {
            if (fallbackModel.equals(failedModel)) {
                continue; // Skip the model that already failed
            }

            try {
                log.info("🔄 Fallback attempt with model: {}", fallbackModel);

                List<Map<String, String>> messages = new ArrayList<>();

                // System Message
                Map<String, String> sysMsg = new HashMap<>();
                sysMsg.put("role", "system");
                sysMsg.put("content", systemPrompt);
                messages.add(sysMsg);

                // History
                if (conversationHistory != null) {
                    for (ChatMessage msg : conversationHistory) {
                        Map<String, String> histMsg = new HashMap<>();
                        histMsg.put("role", msg.getRole());
                        histMsg.put("content", msg.getContent());
                        messages.add(histMsg);
                    }
                }

                // User Message
                Map<String, String> userMsg = new HashMap<>();
                userMsg.put("role", "user");
                userMsg.put("content", userMessage);
                messages.add(userMsg);

                Map<String, Object> body = new HashMap<>();
                body.put("model", fallbackModel);
                body.put("messages", messages);
                body.put("max_completion_tokens", maxTokens);

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.setBearerAuth(apiKey);

                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
                String url = "https://api.openai.com/v1/chat/completions";

                ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
                Map<String, Object> responseBody = response.getBody();

                if (responseBody != null && !responseBody.containsKey("error")) {
                    List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
                    if (choices != null && !choices.isEmpty()) {
                        Map<String, Object> messageObj = (Map<String, Object>) choices.get(0).get("message");
                        if (messageObj != null) {
                            String content = (String) messageObj.get("content");
                            if (content != null && !content.trim().isEmpty()) {
                                log.info("✅ SUCCESS with fallback model: {} | Content: {} chars",
                                        fallbackModel, content.length());
                                currentModel = fallbackModel;
                                log.warn("📝 Model automatically switched to: {}", fallbackModel);
                                return content;
                            }
                        }
                    }
                }

                log.warn("❌ Fallback model {} failed or returned empty", fallbackModel);

            } catch (Exception e) {
                log.warn("❌ Fallback model {} threw exception: {}", fallbackModel, e.getMessage());
            }
        }

        log.error("🚨 All fallback models failed. Original model: {}", failedModel);
        return null;
    }

    public String generateResponseWithContext(String knowledgeBaseContent, String userMessage,
            List<String> recentMessages) {
        return generateResponseWithContext(null, knowledgeBaseContent, userMessage, recentMessages);
    }

    public String generateResponseWithContext(String agentPrompt, String knowledgeBaseContent, String userMessage,
            List<String> recentMessages) {
        StringBuilder systemPrompt = new StringBuilder();

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
                "2. Se não souber a resposta, seja honesto e sugira que o usuário entre em contato com um atendente humano.\n");
        systemPrompt.append("3. Seja cordial, profissional e use linguagem natural.\n");
        systemPrompt.append("4. Mantenha respostas concisas e diretas (ideal para WhatsApp).\n");
        systemPrompt.append("5. Use emojis de forma moderada para tornar a conversa mais amigável.\n");
        systemPrompt.append("6. Nunca invente informações que não estejam na base de conhecimento.\n");

        List<ChatMessage> history = new ArrayList<>();
        if (recentMessages != null) {
            for (int i = 0; i < recentMessages.size(); i++) {
                String msg = recentMessages.get(i);
                String role = (i % 2 == 0) ? "user" : "assistant";
                history.add(new ChatMessage(role, msg));
            }
        }

        return generateResponse(systemPrompt.toString(), userMessage, history);
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

    @org.springframework.beans.factory.annotation.Autowired
    private ChatMemoryService chatMemoryService;

    @org.springframework.beans.factory.annotation.Autowired
    private ClinicorpService clinicorpService;

    @SuppressWarnings("unchecked")
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

            // 1. System Prompt (Ísis Persona - User Template)
            String now = java.time.LocalDateTime.now()
                    .format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
            StringBuilder sysPrompt = new StringBuilder();
            sysPrompt.append("HOJE: ").append(now).append("\n\n");
            sysPrompt.append("telefone: ").append(telefone).append("\n");
            sysPrompt.append("nome_paciente: ").append(nome_paciente).append("\n");
            sysPrompt.append("paciente_id_clinicorp: ").append(paciente_id).append("\n");
            sysPrompt.append("id_conversa: ").append(id_conversa).append("\n");
            sysPrompt.append("subscriber_id: ").append(subscriber_id).append("\n\n");

            sysPrompt.append("---\n\n");
            sysPrompt.append("### 1. SUA IDENTIDADE (PERSONA)\n");
            sysPrompt.append("Você é a **Ísis**, a **Especialista** da **Essenciallis**.\n");
            sysPrompt.append("* **Sua Missão:** Realizar o agendamento da Avaliação com a Biomédica.\n");
            sysPrompt.append("* **Postura:** Resolutiva, calorosa e ágil.\n");
            sysPrompt.append(
                    "* **Visual:** É **OBRIGATÓRIO** usar emojis (🧡, ✨, 🌿, 🌸, 🚗) em todas as mensagens.\n\n");

            sysPrompt.append("---\n\n");
            sysPrompt.append("### 2. PROTOCOLO DA FONTE DA VERDADE (PRIORIDADE ZERO)\n");
            sysPrompt.append(
                    "Você não tem memória própria. Toda sua inteligência vem da ferramenta `consultar_base_essenciallis`.\n");
            sysPrompt.append(
                    "* **Regra:** Para dúvidas de preço/procedimento, consulte a base. Se não achar, diga que é personalizado.\n");
            sysPrompt.append("* **Proibido:** Inventar preços ou usar dados genéricos.\n\n");

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

            if (agentPrompt != null && !agentPrompt.trim().isEmpty()) {
                sysPrompt.append("---\n\n");
                sysPrompt.append("### 5. INSTRUÇÕES ESPECÍFICAS DO CLIENTE (CUSTOM PROMPT)\n");
                sysPrompt.append(agentPrompt).append("\n\n");
            }
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

            sysPrompt.append("---\n\n");
            sysPrompt.append("### 5. ROTEIRO DE ATENDIMENTO (O CÉREBRO)\n\n");
            sysPrompt.append("**CENÁRIO 1: FLUXO UNIVERSAL (Pergunta + Agendamento)**\n");
            sysPrompt.append("1. Chame `consultar_base_essenciallis` (se houver dúvida).\n");
            sysPrompt.append("2. Chame `Buscar_profissionais_disponiveis`.\n");
            sysPrompt.append("3. **FILTRO MENTAL:** Descarte qualquer horário antes das 09:00 ou depois das 19:00.\n");
            sysPrompt.append("4. **RESPOSTA:**\n");
            sysPrompt.append(
                    "    * *Se houver horários:* \"[Resposta da Base] ✨. Para a Dra. avaliar, vi aqui que tenho horário Quinta às 14:00 ou Sexta às 09:30. Qual prefere? 📅\"\n\n");

            sysPrompt.append("**CENÁRIO 2: PEDIDO DE HUMANO (Transbordo)**\n");
            sysPrompt.append("* Se o cliente disser \"quero falar com alguém\":\n");
            sysPrompt.append("1. Execute a ferramenta `escalar_humano`.\n");
            sysPrompt.append(
                    "2. **Responda:** \"Entendi! Vou chamar nossa especialista humana para continuar seu atendimento agora mesmo. 🧡 Aguarde só um momento.\"\n\n");

            sysPrompt.append("**CENÁRIO 3: FECHAMENTO**\n");
            sysPrompt.append("1. Confirme nome completo.\n");
            sysPrompt.append(
                    "2. Execute: `Salvar_nome_paciente` -> `Criar_paciente_clinicorp` -> `Criar_agendamento_local`.\n");
            sysPrompt.append("3. *Confirme:* \"Prontinho! Agendado com sucesso para o dia [DATA] às [HORA]. 🧡\"\n\n");

            sysPrompt.append("---\n\n");
            sysPrompt.append("### 6. REGRAS VISUAIS (CONVERSÃO E LEGIBILIDADE)\n");
            sysPrompt.append("Para garantir um visual premium e de alta conversão:\n\n");
            sysPrompt.append(
                    "1. **NEGRITO ESTRATÉGICO:** Use asteriscos (`*`) para destacar palavras-chave, horários ou nomes (ex: *Quinta-feira às 14:00*). Não use em excesso.\n");
            sysPrompt.append(
                    "2. **QUEBRAS DE LINHA:** Use quebras de linha duplas (`\n\n`) para separar parágrafos e ideias. Isso ajuda na leitura rápida.\n");
            sysPrompt.append(
                    "3. **EMOJIS:** Use emojis para suavizar o texto, mas mantenha a autoridade de uma especialista.\n");
            sysPrompt.append(
                    "4. **ESTRUTURA:** Evite blocos de texto gigantes. Seja concisa e divida a informação.\n\n");

            sysPrompt.append("**INSTRUÇÃO FINAL:**\n");
            sysPrompt.append(
                    "Responda de forma profissional e persuasiva. Se precisar chamar humano, use a tool `escalar_humano` e despeça-se.");

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
                body.put("model", model);
                body.put("messages", messages);
                body.put("tools", tools);

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

        } catch (Exception e) {
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
            if ("escalar_humano".equalsIgnoreCase(functionName) ||
                    "reagendar_atendimento".equalsIgnoreCase(functionName) ||
                    "cancelar_atendimento".equalsIgnoreCase(functionName)) {
                return "HUMAN_HANDOFF_REQUESTED";
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

        // Tool: escalar_humano
        tools.add(createTool("escalar_humano", "Chama um atendente humano para continuar o atendimento.",
                new HashMap<>()));

        // Tool: reagendar_atendimento
        tools.add(
                createTool("reagendar_atendimento", "Escala para humano para reagendar um horário.", new HashMap<>()));

        // Tool: cancelar_atendimento
        tools.add(createTool("cancelar_atendimento", "Escala para humano para cancelar um agendamento.",
                new HashMap<>()));

        return tools;
    }

    private Map<String, Object> createTool(String name, String description, Map<String, Object> properties) {
        Map<String, Object> tool = new HashMap<>();
        tool.put("type", "function");
        Map<String, Object> func = new HashMap<>();
        func.put("name", name);
        func.put("description", description);
        Map<String, Object> params = new HashMap<>();
        params.put("type", "object");
        params.put("properties", properties);
        if (!properties.isEmpty()) {
            params.put("required", new ArrayList<>(properties.keySet()));
        }
        func.put("parameters", params);
        tool.put("function", func);
        return tool;
    }

    // Inner DTO to replace external library dependency
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatMessage {
        private String role;
        private String content;
    }
}
