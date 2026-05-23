package com.backend.winai.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.BiConsumer;
import java.util.stream.Collectors;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import com.backend.winai.dto.ai.AIContext;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.CompanyAgentDocument;
import com.backend.winai.entity.KnowledgeBase;
import com.backend.winai.entity.KnowledgeBaseConnection;
import com.backend.winai.entity.UserWhatsAppConnection;
import com.backend.winai.entity.WhatsAppConversation;
import com.backend.winai.entity.WhatsAppMessage;
import com.backend.winai.entity.Notification;
import com.backend.winai.entity.User;
import com.backend.winai.repository.CompanyAgentDocumentRepository;
import com.backend.winai.repository.KnowledgeBaseAgentDocumentRepository;
import com.backend.winai.repository.KnowledgeBaseConnectionRepository;
import com.backend.winai.repository.UserWhatsAppConnectionRepository;
import com.backend.winai.repository.WhatsAppConversationRepository;
import com.backend.winai.repository.WhatsAppMessageRepository;
import com.backend.winai.repository.UserRepository;
import com.backend.winai.repository.NotificationRepository;
import com.backend.winai.dto.request.SendMediaMessageRequest;
import com.backend.winai.dto.request.SendWhatsAppMessageRequest;
import com.backend.winai.util.AgentDocumentAttachParser;
import com.backend.winai.util.WhatsAppConversationDisplayName;
import com.backend.winai.dto.response.WhatsAppConversationResponse;
import com.backend.winai.dto.response.WhatsAppMessageResponse;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@Transactional(readOnly = true)
public class AIAgentService {

    private final OpenAiService openAiService;
    private final KnowledgeBaseConnectionRepository connectionRepository;
    private final com.backend.winai.repository.KnowledgeBaseRepository knowledgeBaseRepository;
    private final UserWhatsAppConnectionRepository whatsAppConnectionRepository;
    private final WhatsAppMessageRepository messageRepository;
    private final UazapService uazapService;
    private final WhatsAppConversationRepository conversationRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;
    private final FollowUpService followUpService;
    private final GlobalNotificationService globalNotificationService;
    private final com.backend.winai.repository.LeadRepository leadRepository;
    private final KnowledgeBaseAgentDocumentRepository knowledgeBaseAgentDocumentRepository;
    private final CompanyAgentDocumentRepository companyAgentDocumentRepository;
    private final RestTemplate restTemplate;
    /** Proxy para self-invocation e garantir REQUIRES_NEW em persistAndNotifyByConversationId */
    private final AIAgentService self;
    private final AiResponseGuardService aiResponseGuardService;
    private final com.backend.winai.ai.pipeline.handoff.HandoffReversionClassifier handoffReversionClassifier;
    private final com.backend.winai.ai.pipeline.memory.LeadSummaryReconciler leadSummaryReconciler;

    private static final int MAX_AGENT_DOC_SEND_BYTES = 25 * 1024 * 1024;

    @PersistenceContext
    private EntityManager entityManager;

    // ASYNC DEBOUNCING FIELDS
    private final java.util.concurrent.ScheduledExecutorService scheduler = java.util.concurrent.Executors
            .newScheduledThreadPool(10);
    private final java.util.concurrent.ConcurrentHashMap<UUID, java.util.concurrent.ScheduledFuture<?>> debounceMap = new java.util.concurrent.ConcurrentHashMap<>();

    public AIAgentService(
            OpenAiService openAiService,
            KnowledgeBaseConnectionRepository connectionRepository,
            com.backend.winai.repository.KnowledgeBaseRepository knowledgeBaseRepository,
            UserWhatsAppConnectionRepository whatsAppConnectionRepository,
            WhatsAppMessageRepository messageRepository,
            UazapService uazapService,
            WhatsAppConversationRepository conversationRepository,
            UserRepository userRepository,
            NotificationRepository notificationRepository,
            org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate,
            @org.springframework.context.annotation.Lazy FollowUpService followUpService,
            GlobalNotificationService globalNotificationService,
            com.backend.winai.repository.LeadRepository leadRepository,
            KnowledgeBaseAgentDocumentRepository knowledgeBaseAgentDocumentRepository,
            CompanyAgentDocumentRepository companyAgentDocumentRepository,
            RestTemplate restTemplate,
            AiResponseGuardService aiResponseGuardService,
            com.backend.winai.ai.pipeline.handoff.HandoffReversionClassifier handoffReversionClassifier,
            com.backend.winai.ai.pipeline.memory.LeadSummaryReconciler leadSummaryReconciler,
            @org.springframework.context.annotation.Lazy AIAgentService self) {
        this.openAiService = openAiService;
        this.connectionRepository = connectionRepository;
        this.knowledgeBaseRepository = knowledgeBaseRepository;
        this.whatsAppConnectionRepository = whatsAppConnectionRepository;
        this.messageRepository = messageRepository;
        this.uazapService = uazapService;
        this.conversationRepository = conversationRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.messagingTemplate = messagingTemplate;
        this.followUpService = followUpService;
        this.globalNotificationService = globalNotificationService;
        this.leadRepository = leadRepository;
        this.knowledgeBaseAgentDocumentRepository = knowledgeBaseAgentDocumentRepository;
        this.companyAgentDocumentRepository = companyAgentDocumentRepository;
        this.restTemplate = restTemplate;
        this.aiResponseGuardService = aiResponseGuardService;
        this.handoffReversionClassifier = handoffReversionClassifier;
        this.leadSummaryReconciler = leadSummaryReconciler;
        this.self = self;
    }

    @Transactional
    public String processMessageWithAI(WhatsAppConversation conversation, String userMessage, String leadName) {
        return processMessageWithAI(conversation, userMessage, leadName, null);
    }

    @Transactional
    public String processMessageWithAI(WhatsAppConversation conversation, String userMessage, String leadName,
            String imageUrl) {
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

            // Recarrega do banco para garantir prompt e conteúdo atualizados (evita cache)
            try {
                knowledgeBase = knowledgeBaseRepository.findById(knowledgeBase.getId()).orElse(knowledgeBase);
                if (entityManager.contains(knowledgeBase)) {
                    entityManager.refresh(knowledgeBase);
                }
            } catch (Exception e) {
                log.warn("Failed to re-fetch KB, trying to use as is: {}", e.getMessage());
            }

            if (!Boolean.TRUE.equals(knowledgeBase.getIsActive())) {
                log.debug("Knowledge base is not active: {}", knowledgeBase.getId());
                return null;
            }

            log.info("Processing message with AI for conversation: {}, using knowledge base: {}", conv.getId(),
                    knowledgeBase.getName());

            List<OpenAiService.ChatMessage> recentMessages = getRecentConversationHistory(conv.getId(), 30);

            // BRANCHING: Check for Custom System Templates (e.g., Clinicorp)
            if ("clinicorp".equalsIgnoreCase(knowledgeBase.getSystemTemplate())) {
                log.info("Activate Clinicorp System Template for conversation: {} using KB: {}", conv.getId(),
                        knowledgeBase.getId());
                String contextInfo = "Data atual: " + java.time.LocalDateTime.now() + "\nNome do Paciente/Lead: "
                        + (leadName != null ? leadName : "Não identificado");

                // Converter para o formato esperado pela Ísis (Clinicorp flow ainda usa
                // List<String> no processamento interno de tokens)
                List<String> rawMessages = recentMessages.stream().map(OpenAiService.ChatMessage::getContent)
                        .collect(Collectors.toList());
                String clinicPrompt = knowledgeBase.getAgentPrompt();
                String docCatalog = buildAgentDocumentsCatalogAppendix(knowledgeBase.getId());
                if (!docCatalog.isEmpty()) {
                    clinicPrompt = (clinicPrompt != null ? clinicPrompt : "") + "\n\n" + docCatalog;
                }
                String aiResponse = openAiService.generateClinicorpResponse(userMessage, rawMessages, contextInfo,
                        clinicPrompt);

                if (aiResponse != null) {
                    return aiResponse;
                }
            }

            // Standard Flow
            // Enhance Prompt with Lead Name AND Summary if available
            String enhancedAgentPrompt = knowledgeBase.getAgentPrompt();
            StringBuilder contextBuilder = new StringBuilder();

            if (leadName != null && !leadName.isEmpty()) {
                contextBuilder.append("\n[CONTEXTO DO USUÁRIO]\nNome do usuário: ").append(leadName).append("\n");
            }

            // --- INJEÇÃO DA MEMÓRIA DE LONGO PRAZO ---
            if (conv.getLead() != null) {
                com.backend.winai.entity.Lead l = conv.getLead();
                String facts = l.getAiFactsSummary();
                String intent = l.getAiIntentSummary();
                boolean injectedAny = false;
                if (facts != null && !facts.isBlank()) {
                    contextBuilder.append("\n[DADOS DO LEAD — FATOS REGISTRADOS — NUNCA PEÇA NOVAMENTE]\n")
                            .append(facts.trim()).append("\n");
                    injectedAny = true;
                }
                if (intent != null && !intent.isBlank()) {
                    contextBuilder.append("\n[ESTADO ATUAL DO ATENDIMENTO / INTENÇÃO]\n")
                            .append(intent.trim()).append("\n");
                    injectedAny = true;
                }
                if (!injectedAny) {
                    String legacy = l.getAiSummary();
                    if (legacy != null && !legacy.isBlank()) {
                        contextBuilder.append("\n[MEMÓRIA DE LONGO PRAZO]\n").append(legacy).append("\n");
                        injectedAny = true;
                        log.info("[memory] lead={} usando summary LEGADO ({} chars) — facts/intent vazios",
                                l.getId(), legacy.length());
                    }
                }
                if (injectedAny) {
                    log.info("[memory] injetado lead={} facts={} chars intent={} chars",
                            l.getId(),
                            facts != null ? facts.length() : 0,
                            intent != null ? intent.length() : 0);
                } else {
                    log.info("[memory] lead={} SEM summary (facts/intent/legacy vazios)", l.getId());
                }
            } else {
                log.info("[memory] conv={} SEM lead vinculado — não injetou summary", conv.getId());
            }

            if (contextBuilder.length() > 0) {
                enhancedAgentPrompt = (enhancedAgentPrompt != null ? enhancedAgentPrompt : "")
                        + contextBuilder.toString();
            }

            String docCatalog = buildAgentDocumentsCatalogAppendix(knowledgeBase.getId());
            if (!docCatalog.isEmpty()) {
                enhancedAgentPrompt = (enhancedAgentPrompt != null ? enhancedAgentPrompt : "") + "\n\n" + docCatalog;
            }

            AIContext aiContext = AIContext.builder()
                    .company(conv.getCompany())
                    .lead(conv.getLead())
                    .phoneNumber(conv.getPhoneNumber())
                    .conversationId(conv.getId() != null ? conv.getId().toString() : null)
                    .build();

            String aiResponse = openAiService.generateResponseWithContext(enhancedAgentPrompt,
                    knowledgeBase.getContent(), userMessage, imageUrl, recentMessages, aiContext);

            if (aiResponse != null && !aiResponse.isEmpty()) {
                log.info("AI generated response for conversation {}: {} chars", conv.getId(), aiResponse.length());
                return aiResponse;
            }

            log.warn("AI returned empty response for conversation: {}", conv.getId());
            return null;

        } catch (Exception e) {
            log.error("Error processing message with AI for conversation {}: {}", conversation.getId(), e.getMessage(),
                    e);
            return null;
        }
    }

    public boolean sendAIResponse(WhatsAppConversation conversation, String aiResponse) {
        try {
            if (aiResponse == null || aiResponse.isEmpty()) {
                return false;
            }

            String phoneNumber = conversation.getPhoneNumber();
            String waChatId = conversation.getWaChatId();
            if (waChatId != null && !waChatId.isBlank()) {
                String derived = waChatId.replaceAll("@.*", "").trim();
                if (!derived.isEmpty() && derived.matches("\\d+") && !derived.equals(phoneNumber)) {
                    log.warn(
                            "[PhoneMismatch] conv {} phone_number={} != wa_chatid={} — usando wa_chatid como destino",
                            conversation.getId(), phoneNumber, derived);
                    phoneNumber = derived;
                }
            }
            String baseUrl = null;
            String token = null;
            String instanceName = conversation.getUazapInstance();

            // Priorizar conexão (sempre atualizada) sobre conversa (pode ter credenciais antigas)
            UserWhatsAppConnection connection = findConnectionForConversation(conversation);
            if (connection != null) {
                baseUrl = connection.getInstanceBaseUrl();
                token = connection.getInstanceToken();
                if (instanceName == null || instanceName.isEmpty()) {
                    instanceName = connection.getInstanceName();
                }
            }

            // Fallback: credenciais da conversa (se conexão não encontrada)
            if (baseUrl == null) baseUrl = conversation.getUazapBaseUrl();
            if (token == null) token = conversation.getUazapToken();

            if (baseUrl == null || token == null || phoneNumber == null) {
                log.warn("Missing credentials to send AI response for conversation: {}", conversation.getId());
                return false;
            }

            if (!aiResponseGuardService.tryRegisterOutboundText(conversation.getId(), aiResponse)) {
                log.info("Texto outbound ignorado (duplicata recente) conv={}", conversation.getId());
                return false;
            }

            uazapService.sendTextMessage(phoneNumber, aiResponse, baseUrl, token, instanceName, 1);
            log.info("AI response sent successfully to {} for conversation {}", phoneNumber, conversation.getId());
            return true;

        } catch (Exception e) {
            log.error("Failed to send AI response for conversation {}: {}", conversation.getId(), e.getMessage(), e);
            return false;
        }
    }

    @Transactional
    public String processAndRespond(WhatsAppConversation conversation, String userMessage, String leadName) {
        return processAndRespond(conversation, userMessage, leadName, null);
    }

    @Transactional
    public String processAndRespond(WhatsAppConversation conversation, String userMessage, String leadName,
            String imageUrl) {
        UUID conversationId = conversation.getId();
        log.info(">>> [ASYNC DEBOUNCE] Received message for conversation {}. Scheduling/Rescheduling AI response...",
                conversationId);

        long debounceGeneration = aiResponseGuardService.nextDebounceGeneration(conversationId);

        // 1. Cancel previous task if exists (DEBOUNCING)
        java.util.concurrent.ScheduledFuture<?> existingTask = debounceMap.get(conversationId);
        if (existingTask != null && !existingTask.isDone()) {
            boolean cancelled = existingTask.cancel(true);
            log.info(">>> [ASYNC DEBOUNCE] Previous task cancelled? {}", cancelled);
        }

        // 2. Set "Composing" immediately to acknowledge receipt
        // Typing indicator removed as per user request

        // 3. Schedule new task (2s debounce local + geração Redis distribuída)
        java.util.concurrent.ScheduledFuture<?> newTask = scheduler.schedule(() -> {
            try {
                if (!aiResponseGuardService.isDebounceGenerationCurrent(conversationId, debounceGeneration)) {
                    log.info(">>> [ASYNC DEBOUNCE] Geração {} obsoleta para conv {}, ignorando execução",
                            debounceGeneration, conversationId);
                    return;
                }
                debounceMap.remove(conversationId);
                executeScheduledAIProcessing(conversationId, leadName, imageUrl);
            } catch (Exception e) {
                log.error("Error in scheduled AI processing for {}: {}", conversationId, e.getMessage(), e);
            }
        }, 2, java.util.concurrent.TimeUnit.SECONDS);

        debounceMap.put(conversationId, newTask);

        return "QUEUED_FOR_PROCESSING";
    }

    /**
     * Lógica real de processamento da IA, executada após os 10s de silêncio.
     * Busca o histórico ATUALIZADO (incluindo todas as msgs que chegaram no delay).
     */
    @Transactional
    protected void executeScheduledAIProcessing(UUID conversationId, String leadName, String imageUrl) {
        log.info(">>> [ASYNC EXECUTION] Starting delayed AI processing for conversation {}", conversationId);

        if (!aiResponseGuardService.tryAcquireProcessingLock(conversationId)) {
            return;
        }

        try {
            executeScheduledAIProcessingLocked(conversationId, leadName, imageUrl, null);
        } finally {
            aiResponseGuardService.releaseProcessingLock(conversationId);
        }
    }

    /**
     * Entrada do novo pipeline (com aggregator + decisor + Redis inflight/buffer).
     * Equivalente a {@link #executeScheduledAIProcessing} mas com hook entre a
     * geração do GPT e o envio — usado pelo CoalesceInterruptMerger para
     * reconciliar mensagens novas que chegaram durante a geração.
     *
     * Se {@code coalesceHook} retornar null, o envio é abortado (sinal de regenerar).
     */
    @Transactional
    public void runFromPipeline(UUID conversationId, String leadName, String imageUrl,
                                java.util.function.Function<String, String> coalesceHook) {
        log.info(">>> [PIPELINE] Iniciando execução para conversa {}", conversationId);
        if (!aiResponseGuardService.tryAcquireProcessingLock(conversationId)) {
            return;
        }
        try {
            executeScheduledAIProcessingLocked(conversationId, leadName, imageUrl, coalesceHook);
        } finally {
            aiResponseGuardService.releaseProcessingLock(conversationId);
        }
    }

    private void executeScheduledAIProcessingLocked(UUID conversationId, String leadName, String imageUrl,
            java.util.function.Function<String, String> coalesceHook) {
        // 1. Re-fetch conversation to ensure attached session and latest data
        WhatsAppConversation conv = conversationRepository.findByIdWithCompany(conversationId).orElse(null);
        if (conv == null) {
            log.error("Conversation {} not found during scheduled execution", conversationId);
            return;
        }

        // 2. Check Human Mode — antes de abortar, dá uma chance do classificador
        //    de reversão decidir se o lead mudou de assunto (e a IA pode voltar).
        if ("HUMAN".equalsIgnoreCase(conv.getSupportMode())) {
            if (tryRevertFromHumanIfLeadChangedTopic(conv)) {
                log.info("Conversation {}: HandoffReversion decidiu REVERT — IA volta a responder", conversationId);
            } else {
                log.info("Conversation {} em HUMAN mode. Abortando IA.", conversationId);
                return;
            }
        }

        // 3. "Digitando…" no chat do lead enquanto a IA gera a resposta.
        // UazAPI mantém a presença por até `delay` ms reenviando a cada 10s; limpamos no finally.
        sendPresenceForConversation(conv, "composing", 30_000);

        try {
            // 4. Intent Classification Phase
            // Fetch fresh history (Process all accumulated messages)
            List<OpenAiService.ChatMessage> rawHistory = getRecentConversationHistory(conversationId, 6);
            List<OpenAiService.ChatMessage> historyForClass = new ArrayList<>();
            for (OpenAiService.ChatMessage histMsg : rawHistory) {
                historyForClass.add(new OpenAiService.ChatMessage("user", histMsg.getContent()));
            }

            // Use the very last message for context, but history drives the intent
            String lastUserMessage = !rawHistory.isEmpty() ? rawHistory.get(rawHistory.size() - 1).getContent() : "";

            String intent = openAiService.analyzeIntent(lastUserMessage, historyForClass);

            if ("HANDOFF".equals(intent)) {
                log.info("🎯 Intent Classifier detected HANDOFF. Switching to HUMAN.");
                handleHumanHandoff(conv, true);
                updateLeadMemory(conv, "HUMAN_HANDOFF_REQUESTED"); // Força update de memória
                return;
            }

            // 5. Generate Response
            // Note: processMessageWithAI will reload history internally for 30 messages
            // context
            String aiResponse = processMessageWithAI(conv, lastUserMessage, leadName, imageUrl);

            if (aiResponse != null && !aiResponse.isEmpty()) {
                // Check for Human Handoff Request from Tool Call inside Loop
                if ("HUMAN_HANDOFF_REQUESTED".equals(aiResponse)) {
                    handleHumanHandoff(conv);
                    updateLeadMemory(conv, "HUMAN_HANDOFF_REQUESTED");
                    return;
                }

                // Detect Summary Tag
                boolean forceValidation = aiResponse.contains("[SUMMARY]");
                String working = aiResponse;
                if (forceValidation) {
                    working = working.replace("[SUMMARY]", "").trim();
                }

                AgentDocumentAttachParser.Result attachParse = AgentDocumentAttachParser.parse(working);
                String textToUser = attachParse.visibleText();
                java.util.List<UUID> attachDocIds = attachParse.attachDocumentIds();

                // Coalesce-interrupt: mescla mensagens novas que chegaram durante a geração.
                if (coalesceHook != null && textToUser != null && !textToUser.isBlank()) {
                    try {
                        String merged = coalesceHook.apply(textToUser);
                        if (merged == null) {
                            log.info("Coalesce hook sinalizou regenerar — abortando envio para {}", conversationId);
                            return;
                        }
                        textToUser = merged;
                    } catch (Exception e) {
                        log.warn("Coalesce hook lançou exceção para {}: {} — usando draft original",
                                conversationId, e.getMessage());
                    }
                }

                if (textToUser != null && !textToUser.isBlank()) {
                    sendSplitResponse(conv, textToUser);
                }

                for (UUID attachDocId : attachDocIds) {
                    sendKbLinkedAgentDocument(conv, attachDocId);
                }

                // Update Follow-up
                try {
                    followUpService.updateLastMessage(conv.getId(), "AI");
                } catch (Exception e) {
                }

                // Update Memory (sem linha ATTACH_DOC)
                String memoryText = textToUser != null && !textToUser.isBlank() ? textToUser : "";
                if (!attachDocIds.isEmpty()) {
                    memoryText = memoryText.isEmpty() ? "📎 Documento enviado" : memoryText + " 📎";
                }
                if (memoryText.isBlank()) {
                    memoryText = aiResponse;
                }
                updateLeadMemory(conv, forceValidation ? "[SUMMARY]" : memoryText);
            } else {
                log.warn("AI returned empty response in scheduled task for {}", conversationId);
            }
        } finally {
            // Encerra "digitando" no chat do lead, independente do resultado.
            sendPresenceForConversation(conv, "paused", 0);
        }
    }

    private boolean tryRevertFromHumanIfLeadChangedTopic(WhatsAppConversation conv) {
        try {
            List<WhatsAppMessage> recent = messageRepository
                    .findByConversationIdOrderByMessageTimestampDesc(conv.getId())
                    .stream()
                    .limit(20)
                    .collect(Collectors.toList());

            if (recent.isEmpty()) {
                return false;
            }

            WhatsAppMessage latest = recent.get(0);
            if (Boolean.TRUE.equals(latest.getFromMe()) || latest.getContent() == null) {
                return false;
            }

            boolean humanRepliedAfterHandoff = false;
            for (WhatsAppMessage m : recent) {
                if (!Boolean.TRUE.equals(m.getFromMe())) continue;
                if (m.getContent() == null) continue;
                String c = m.getContent().trim();
                if (c.startsWith("Entendi! Vou chamar nossa especialista humana")
                        || c.startsWith("Vou conectar você com um especialista")
                        || isCustomHandoffMessage(conv, c)) {
                    break;
                }
                humanRepliedAfterHandoff = true;
                break;
            }
            if (humanRepliedAfterHandoff) {
                return false;
            }

            List<OpenAiService.ChatMessage> history = new ArrayList<>();
            for (int i = recent.size() - 1; i >= 0; i--) {
                WhatsAppMessage m = recent.get(i);
                if (m == null || m.getContent() == null) continue;
                String role = Boolean.TRUE.equals(m.getFromMe()) ? "assistant" : "user";
                history.add(new OpenAiService.ChatMessage(role, m.getContent()));
            }

            var decision = handoffReversionClassifier.classify(history, latest.getContent());
            if (decision != com.backend.winai.ai.pipeline.handoff.HandoffReversionClassifier.Decision.REVERT) {
                return false;
            }

            conv.setSupportMode("IA");
            conversationRepository.save(conv);

            try {
                UUID companyId = conv.getCompany() != null ? conv.getCompany().getId() : null;
                if (companyId != null) {
                    com.backend.winai.dto.response.WebSocketMessage modeChange = com.backend.winai.dto.response.WebSocketMessage
                            .builder().type("SUPPORT_MODE_CHANGED").conversationId(conv.getId().toString())
                            .mode("IA").companyId(companyId).build();
                    messagingTemplate.convertAndSend("/topic/whatsapp/" + companyId, modeChange);
                    messagingTemplate.convertAndSend("/topic/whatsapp/conversations/" + companyId, modeChange);
                }
            } catch (Exception e) {
                log.debug("Broadcast SUPPORT_MODE_CHANGED falhou: {}", e.getMessage());
            }

            try {
                followUpService.resumeFollowUp(conv.getId());
            } catch (Exception ignored) {
            }

            try {
                updateLeadMemory(conv, "[SUMMARY]");
                log.info("[memory] summary regenerado após HandoffReversion REVERT conv={}", conv.getId());
            } catch (Exception e) {
                log.warn("[memory] falha ao regenerar summary pós-revert conv {}: {}", conv.getId(), e.getMessage());
            }
            return true;
        } catch (Exception e) {
            log.warn("tryRevertFromHumanIfLeadChangedTopic erro conv {}: {}", conv.getId(), e.getMessage());
            return false;
        }
    }

    private boolean isCustomHandoffMessage(WhatsAppConversation conv, String content) {
        try {
            if (conv.getCompany() == null) return false;
            var globalConfig = globalNotificationService.getConfig(conv.getCompany().getId());
            if (globalConfig == null) return false;
            String custom = globalConfig.getHumanHandoffClientMessage();
            if (custom == null || custom.isBlank()) return false;
            return content.trim().equals(custom.trim());
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Atualiza a memória de longo prazo do Lead com base no histórico recente.
     */
    @Transactional
    public void updateLeadMemory(WhatsAppConversation conversation, String aiResponse) {
        try {
            if (conversation.getLead() == null)
                return;

            // Recarregar lead para garantir estado atual
            com.backend.winai.entity.Lead lead = leadRepository.findById(conversation.getLead().getId()).orElse(null);
            if (lead == null)
                return;

            // 1. Incrementar contador de interações
            int currentCount = lead.getInteractionCount() != null ? lead.getInteractionCount() : 0;
            currentCount++;
            lead.setInteractionCount(currentCount);

            // Flags para forçar atualização
            boolean forceUpdate = false;
            String triggerReason = "Time/Throttle";

            // 2. Transição para Humano (REGRA CRÍTICA)
            if ("HUMAN_HANDOFF_REQUESTED".equals(aiResponse)) {
                forceUpdate = true;
                triggerReason = "Human Handoff";
            }
            // 3. Tag explícita da IA
            else if (aiResponse != null && aiResponse.contains("[SUMMARY]")) {
                forceUpdate = true;
                triggerReason = "[SUMMARY] Tag";
            }
            // 4. Regra de Volume (A cada 5 interações)
            else if (currentCount >= 5) {
                forceUpdate = true;
                triggerReason = "5 Interactions Volume";
            }

            // Se não for forçado, aplica regra de tempo (apenas backup: 60 min)
            if (!forceUpdate && lead.getLastSummaryAt() != null) {
                long minutesSinceLastUpdate = java.time.Duration
                        .between(lead.getLastSummaryAt(), java.time.LocalDateTime.now()).toMinutes();
                if (minutesSinceLastUpdate < 60) {
                    // Apenas salva o incremento do contador de interações
                    leadRepository.save(lead);
                    return;
                }
            }

            // Realiza atualização do RESUMO
            List<OpenAiService.ChatMessage> history = getRecentConversationHistory(conversation.getId(), 30); // Aumentado
                                                                                                              // para
                                                                                                              // pegar
                                                                                                              // contexto
                                                                                                              // maior
            if (history.isEmpty())
                return;

            log.info("Updating Lead Memory. Reason: {}", triggerReason);

            String currentFacts = lead.getAiFactsSummary();
            String currentIntent = lead.getAiIntentSummary();
            String legacy = lead.getAiSummary();
            if ((currentFacts == null || currentFacts.isBlank()) && legacy != null && !legacy.isBlank()) {
                currentFacts = legacy;
            }

            String generatedFacts = openAiService.summarizeLeadFacts(currentFacts, history);
            String generatedIntent = openAiService.summarizeLeadIntent(currentIntent, history);

            String reconciledFacts = leadSummaryReconciler.reconcileFacts(currentFacts, generatedFacts);
            String reconciledIntent = leadSummaryReconciler.reconcileIntent(currentIntent, generatedIntent);

            boolean anyChange = false;
            if (reconciledFacts != null && !reconciledFacts.isBlank()) {
                lead.setAiFactsSummary(reconciledFacts);
                anyChange = true;
            }
            if (reconciledIntent != null && !reconciledIntent.isBlank()) {
                lead.setAiIntentSummary(reconciledIntent);
                anyChange = true;
            }

            if (anyChange) {
                StringBuilder combined = new StringBuilder();
                if (lead.getAiFactsSummary() != null && !lead.getAiFactsSummary().isBlank()) {
                    combined.append("FATOS: ").append(lead.getAiFactsSummary().trim());
                }
                if (lead.getAiIntentSummary() != null && !lead.getAiIntentSummary().isBlank()) {
                    if (combined.length() > 0) combined.append('\n');
                    combined.append("INTENÇÃO: ").append(lead.getAiIntentSummary().trim());
                }
                lead.setAiSummary(combined.toString());
                lead.setLastSummaryAt(java.time.LocalDateTime.now());
                lead.setInteractionCount(0);
                leadRepository.save(lead);
                log.info("Memória do Lead {} atualizada (facts={} chars, intent={} chars)",
                        lead.getId(),
                        lead.getAiFactsSummary() != null ? lead.getAiFactsSummary().length() : 0,
                        lead.getAiIntentSummary() != null ? lead.getAiIntentSummary().length() : 0);
            } else {
                leadRepository.save(lead);
            }
        } catch (Exception e) {
            log.error("Erro ao atualizar memória do lead: {}", e.getMessage());
        }
    }

    /**
     * Envia uma resposta longa dividida em múltiplos chunks, mantendo a ordem e
     * persistindo cada um.
     */
    public boolean sendSplitResponse(WhatsAppConversation conversation, String fullResponse) {
        if (fullResponse == null || fullResponse.isBlank()) {
            return false;
        }

        List<String> chunks = splitMessage(fullResponse);
        log.info("Processando envio de resposta longa ({} chunks) para conversa {}", chunks.size(),
                conversation.getId());

        boolean allSent = true;
        java.util.Set<String> sentNormalizedChunks = new java.util.LinkedHashSet<>();
        for (int i = 0; i < chunks.size(); i++) {
            String chunk = chunks.get(i);
            String normalizedChunk = AiResponseGuardService.normalizeContent(chunk);
            if (normalizedChunk != null && !sentNormalizedChunks.add(normalizedChunk)) {
                log.info("Chunk {}/{} ignorado (conteúdo repetido na mesma resposta) conv={}", i + 1, chunks.size(),
                        conversation.getId());
                continue;
            }
            log.debug("Enviando chunk {}/{} ({} chars)", i + 1, chunks.size(), chunk.length());

            boolean sent = sendAIResponse(conversation, chunk);
            if (sent) {
                persistAndNotify(conversation, chunk);

                // Pequeno delay entre mensagens se houver mais chunks (simula digitação)
                if (i < chunks.size() - 1) {
                    try {
                        // Delay maior para mensagens mais longas
                        long delay = Math.min(5000, 1500 + (chunk.length() * 10L));
                        Thread.sleep(delay);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            } else {
                log.error("Falha ao enviar chunk {}/{} do follow-up. Interrompendo sequência para evitar confusão.",
                        i + 1, chunks.size());
                allSent = false;
                break;
            }
        }
        return allSent;
    }

    /**
     * Envia resposta em chunks para o Uazap e usa o callback para persistir/notificar (ex.: no backend).
     * Usado pelo follow-up worker para persistir no backend em vez de localmente.
     */
    public boolean sendSplitResponseWithRemotePersist(WhatsAppConversation conversation, String fullResponse,
            BiConsumer<UUID, String> persistNotifier) {
        if (fullResponse == null || fullResponse.isBlank() || persistNotifier == null) {
            return false;
        }
        List<String> chunks = splitMessage(fullResponse);
        log.info("Processando envio de resposta longa ({} chunks) para conversa {} [remote persist]", chunks.size(),
                conversation.getId());

        boolean allSent = true;
        java.util.Set<String> sentNormalizedChunks = new java.util.LinkedHashSet<>();
        for (int i = 0; i < chunks.size(); i++) {
            String chunk = chunks.get(i);
            String normalizedChunk = AiResponseGuardService.normalizeContent(chunk);
            if (normalizedChunk != null && !sentNormalizedChunks.add(normalizedChunk)) {
                log.info("Chunk {}/{} ignorado (conteúdo repetido) conv={} [remote persist]", i + 1, chunks.size(),
                        conversation.getId());
                continue;
            }
            log.debug("Enviando chunk {}/{} ({} chars)", i + 1, chunks.size(), chunk.length());

            boolean sent = sendAIResponse(conversation, chunk);
            if (sent) {
                persistNotifier.accept(conversation.getId(), chunk);
                if (i < chunks.size() - 1) {
                    try {
                        long delay = Math.min(5000, 1500 + (chunk.length() * 10L));
                        Thread.sleep(delay);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            } else {
                log.error("Falha ao enviar chunk {}/{} do follow-up. Interrompendo sequência.", i + 1, chunks.size());
                allSent = false;
                break;
            }
        }
        return allSent;
    }

    /**
     * Divide a resposta da IA em partes lógicas para envio separado no WhatsApp.
     * Prioriza a tag [SPLIT] definida pela IA. Se não houver, usa lógica de
     * parágrafo.
     */
    private List<String> splitMessage(String content) {
        List<String> chunks = new ArrayList<>();
        if (content == null || content.isEmpty())
            return chunks;

        // Limpeza inicial
        content = content.replace("\r", "");

        // 1. Prioridade: Split por tag explícita da IA [SPLIT]
        if (content.contains("[SPLIT]")) {
            String[] parts = content.split("\\[SPLIT\\]");
            for (String part : parts) {
                String trimmed = part.trim();
                if (!trimmed.isEmpty()) {
                    chunks.add(trimmed);
                }
            }
            return chunks;
        }

        // 2. Fallback: Se não tiver tag, divide apenas por parágrafos duplos (\n\n)
        // Somente divide por quebra simples (\n) se o bloco for extremamente longo (>
        // 700)
        String[] sections = content.split("\\n\\n+");

        for (String section : sections) {
            String trimmedSection = section.trim();
            if (trimmedSection.isEmpty())
                continue;

            if (trimmedSection.length() > 700) {
                // Tenta agrupar linhas se o bloco for gigante
                String[] lines = trimmedSection.split("\\n");
                StringBuilder currentChunk = new StringBuilder();
                for (String line : lines) {
                    String trimmedLine = line.trim();
                    if (trimmedLine.isEmpty())
                        continue;

                    if (currentChunk.length() + trimmedLine.length() > 500) {
                        chunks.add(currentChunk.toString().trim());
                        currentChunk = new StringBuilder();
                    }
                    if (currentChunk.length() > 0)
                        currentChunk.append("\n");
                    currentChunk.append(trimmedLine);
                }
                if (currentChunk.length() > 0) {
                    chunks.add(currentChunk.toString().trim());
                }
            } else {
                chunks.add(trimmedSection);
            }
        }

        return chunks;
    }

    public void persistAndNotify(WhatsAppConversation conversation, String aiResponse) {
        if (conversation == null || conversation.getId() == null) {
            log.warn("persistAndNotify: conversation or id null");
            return;
        }
        UUID conversationId = conversation.getId();
        UUID companyId = conversation.getCompany() != null ? conversation.getCompany().getId() : null;
        if (companyId == null) {
            log.warn("persistAndNotify: company null for conversation {}", conversationId);
            return;
        }
        self.persistAndNotifyByConversationId(conversationId, companyId, aiResponse);
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW, readOnly = false)
    public void persistAndNotifyByConversationId(UUID conversationId, UUID companyId, String aiResponse) {
        try {
            if (aiResponse == null || aiResponse.trim().isEmpty()) {
                log.warn("Received empty AI response for conversation: {}", conversationId);
                return;
            }
            WhatsAppConversation conversation = conversationRepository.findByIdWithCompany(conversationId)
                    .orElse(null);
            if (conversation == null) {
                log.warn("Conversation not found for persistAndNotify: {}", conversationId);
                return;
            }
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
            aiMessage = messageRepository.saveAndFlush(aiMessage);
            conversation.setLastMessageText(aiResponse.length() > 250 ? aiResponse.substring(0, 247) + "..." : aiResponse);
            conversation.setLastMessageTimestamp(aiMessage.getMessageTimestamp());
            conversationRepository.saveAndFlush(conversation);
            sendWebSocketUpdate(companyId, aiMessage, conversation);
        } catch (Exception e) {
            log.error("Erro ao persistir/notificar resposta da IA para conversa {}: {}", conversationId, e.getMessage(), e);
        }
    }

    private void sendWebSocketUpdate(UUID companyId, WhatsAppMessage message, WhatsAppConversation conversation) {
        try {
            if (message != null) {
                log.debug("Sending WebSocket update - Message ID: {}, Content length: {}, From me: {}", message.getId(),
                        message.getContent() != null ? message.getContent().length() : 0, message.getFromMe());
            } else {
                log.debug("Sending WebSocket update for conversation: {}", conversation.getId());
            }

            // Converter para DTOs para evitar LazyInitializationException durante
            // serialização JSON
            WhatsAppMessageResponse messageDto = toMessageResponse(message);
            WhatsAppConversationResponse conversationDto = toConversationResponse(conversation);

            if (messageDto != null) {
                com.backend.winai.dto.response.WebSocketMessage wsMessage = com.backend.winai.dto.response.WebSocketMessage
                        .builder().type("NEW_MESSAGE").message(messageDto).conversation(conversationDto)
                        .companyId(companyId).build();

                messagingTemplate.convertAndSend("/topic/whatsapp/" + companyId, wsMessage);
            }

            com.backend.winai.dto.response.WebSocketMessage convUpdate = com.backend.winai.dto.response.WebSocketMessage
                    .builder().type("CONVERSATION_UPDATED").conversation(conversationDto).companyId(companyId).build();

            messagingTemplate.convertAndSend("/topic/whatsapp/conversations/" + companyId, convUpdate);

            log.info("WebSocket updates sent successfully for company: {}", companyId);
        } catch (Exception e) {
            log.error("Erro ao enviar update WebSocket: {}", e.getMessage(), e);
        }
    }

    @Transactional
    public void handleHumanHandoff(WhatsAppConversation conversation) {
        handleHumanHandoff(conversation, true);
    }

    @Transactional
    public void handleHumanHandoff(WhatsAppConversation conversation, boolean sendClientMessage) {
        log.info("Initiating human handoff for conversation: {}", conversation.getId());

        // 1. Update support mode
        conversation.setSupportMode("HUMAN");
        conversationRepository.save(conversation);

        // 1.1 Pause automated follow-ups during human intervention
        followUpService.pauseFollowUp(conversation.getId());

        // 2. BROADCAST MODE CHANGE IMMEDIATELY for real-time UI feedback
        // Send to both specific conversation AND general company topics
        try {
            UUID companyId = conversation.getCompany().getId();
            com.backend.winai.dto.response.WebSocketMessage modeChange = com.backend.winai.dto.response.WebSocketMessage
                    .builder().type("SUPPORT_MODE_CHANGED").conversationId(conversation.getId().toString())
                    .mode("HUMAN").companyId(companyId).build();

            log.info("Broadcasting SUPPORT_MODE_CHANGED to /topic/whatsapp/{} and /topic/whatsapp/conversations/{}",
                    companyId, companyId);
            messagingTemplate.convertAndSend("/topic/whatsapp/" + companyId, modeChange);
            messagingTemplate.convertAndSend("/topic/whatsapp/conversations/" + companyId, modeChange);
        } catch (Exception e) {
            log.warn("Falha ao enviar broadcast inicial de handoff: {}", e.getMessage());
        }

        // 3. Send handoff message to client (ONLY IF REQUESTED)
        if (sendClientMessage) {
            String handoffMsg = "Entendi! Vou chamar nossa especialista humana para continuar seu atendimento agora mesmo. 🧡 Aguarde só um momento. 🌿✨";

            try {
                if (conversation.getCompany() != null) {
                    var globalConfig = globalNotificationService.getConfig(conversation.getCompany().getId());
                    if (globalConfig != null && globalConfig.getHumanHandoffClientMessage() != null
                            && !globalConfig.getHumanHandoffClientMessage().isBlank()) {
                        handoffMsg = globalConfig.getHumanHandoffClientMessage();
                    }
                }
            } catch (Exception e) {
                log.warn("Erro ao buscar mensagem personalizada de handoff, usando padrão: {}", e.getMessage());
            }

            sendAIResponse(conversation, handoffMsg);
            persistAndNotify(conversation, handoffMsg);
        }

        // 4. Create notifications for all company users
        if (conversation.getCompany() != null) {
            List<User> companyUsers = userRepository.findByCompanyId(conversation.getCompany().getId());
            String title = "Atendimento Humano Solicitado";
            String contactDisplay = WhatsAppConversationDisplayName.resolve(conversation);
            String message = "O contato "
                    + (contactDisplay != null && !contactDisplay.isBlank() ? contactDisplay
                            : conversation.getPhoneNumber())
                    + " solicitou um atendente.";

            for (User user : companyUsers) {
                Notification notification = Notification.builder()
                        .user(user)
                        .company(conversation.getCompany())
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

            // 5. Send notification event (Mode change was already sent at #2)
            com.backend.winai.dto.response.WebSocketMessage notificationEvent = com.backend.winai.dto.response.WebSocketMessage
                    .builder().type("NOTIFICATION_RECEIVED").companyId(conversation.getCompany().getId()).build();
            messagingTemplate.convertAndSend("/topic/whatsapp/" + conversation.getCompany().getId(), notificationEvent);

            sendHumanHandoffWhatsAppNotification(conversation);
        }

        try {
            updateLeadMemory(conversation, "HUMAN_HANDOFF_REQUESTED");
        } catch (Exception e) {
            log.warn("Falha ao atualizar memória do lead no handoff: {}", e.getMessage());
        }
    }

    private void sendHumanHandoffWhatsAppNotification(WhatsAppConversation conversation) {
        try {
            var config = globalNotificationService.getConfig(conversation.getCompany().getId());

            if (config == null) {
                log.debug(
                        "Nenhuma configuração de Notificação Global para empresa {}, pulando notificação WhatsApp de handoff",
                        conversation.getCompany().getId());
                return;
            }

            if (!Boolean.TRUE.equals(config.getHumanHandoffNotificationEnabled())) {
                log.debug("Notificação WhatsApp de handoff desabilitada para empresa {}",
                        conversation.getCompany().getId());
                return;
            }

            String targetPhone = config.getHumanHandoffPhone();
            if (targetPhone == null || targetPhone.isBlank()) {
                log.warn("Número de telefone para handoff não configurado para empresa {}",
                        conversation.getCompany().getId());
                return;
            }

            String leadName = WhatsAppConversationDisplayName.resolve(conversation);
            if (leadName == null || leadName.isBlank()) {
                leadName = "Lead";
            }
            String leadPhone = conversation.getPhoneNumber() != null ? conversation.getPhoneNumber() : "N/A";

            String notificationMessage;
            if (config.getHumanHandoffMessage() != null && !config.getHumanHandoffMessage().isBlank()) {
                notificationMessage = config.getHumanHandoffMessage().replace("{leadName}", leadName)
                        .replace("{phoneNumber}", leadPhone)
                        .replace("{conversationId}", conversation.getId().toString());
            } else {
                notificationMessage = String.format("*Atendimento Humano Solicitado*\n\n"
                        + "O lead *%s* (%s) está solicitando atendimento humano.\n\n" + "Acesse o painel para atender.",
                        leadName, leadPhone);
            }

            var connections = whatsAppConnectionRepository.findByCompanyId(conversation.getCompany().getId());
            log.info("=== [HANDOFF NOTIFICATION] Buscando conexão para empresa {} ===",
                    conversation.getCompany().getId());
            log.info("  Conexões encontradas: {}", connections.size());
            for (int i = 0; i < connections.size(); i++) {
                var c = connections.get(i);
                log.info("    [{}] Instance: {}, BaseUrl: {}, Token: {}, Active: {}",
                        i, c.getInstanceName(), c.getInstanceBaseUrl(),
                        c.getInstanceToken() != null ? "[PRESENTE]" : "[AUSENTE]",
                        c.getIsActive());
            }

            if (connections.isEmpty()) {
                log.warn(
                        "Nenhuma conexão WhatsApp ativa para empresa {}, não foi possível enviar notificação de handoff",
                        conversation.getCompany().getId());
                return;
            }

            UserWhatsAppConnection connection = connections.stream().filter(c -> Boolean.TRUE.equals(c.getIsActive()))
                    .findFirst().orElse(connections.get(0));

            log.info("  === CONEXÃO SELECIONADA ===");
            log.info("    Instance: {}", connection.getInstanceName());
            log.info("    BaseUrl: {}", connection.getInstanceBaseUrl());
            log.info("    Token: {}", connection.getInstanceToken() != null ? "[PRESENTE]" : "[AUSENTE]");
            log.info("    Active: {}", connection.getIsActive());

            SendWhatsAppMessageRequest request = SendWhatsAppMessageRequest.builder().phoneNumber(targetPhone)
                    .message(notificationMessage).uazapInstance(connection.getInstanceName())
                    .uazapBaseUrl(connection.getInstanceBaseUrl()).uazapToken(connection.getInstanceToken()).build();

            log.info("  === REQUEST DTO CONSTRUÍDO ===");
            log.info("    phoneNumber: {}", targetPhone);
            log.info("    uazapInstance: {}", request.getUazapInstance());
            log.info("    uazapBaseUrl: {}", request.getUazapBaseUrl());
            log.info("    uazapToken: {}", request.getUazapToken() != null ? "[PRESENTE]" : "[AUSENTE]");

            uazapService.sendTextMessage(request, conversation.getCompany());

            log.info("Notificação WhatsApp de handoff enviada para {} (empresa {})", targetPhone,
                    conversation.getCompany().getName());

        } catch (Exception e) {
            log.error("Erro ao enviar notificação WhatsApp de handoff: {}", e.getMessage(), e);
        }
    }

    private WhatsAppMessageResponse toMessageResponse(WhatsAppMessage message) {
        if (message == null) {
            return null;
        }
        return WhatsAppMessageResponse.builder().id(message.getId()).conversationId(message.getConversation().getId())
                .leadId(message.getLead() != null ? message.getLead().getId() : null).messageId(message.getMessageId())
                .content(message.getContent()).fromMe(message.getFromMe()).messageType(message.getMessageType())
                .mediaType(message.getMediaType()).mediaUrl(message.getMediaUrl())
                .mediaDuration(message.getMediaDuration()).transcription(message.getTranscription())
                .status(message.getStatus()).messageTimestamp(message.getMessageTimestamp())
                .createdAt(message.getCreatedAt()).build();
    }

    private WhatsAppConversationResponse toConversationResponse(WhatsAppConversation conversation) {
        if (conversation == null) {
            return null;
        }
        return WhatsAppConversationResponse.builder().id(conversation.getId())
                .companyId(conversation.getCompany() != null ? conversation.getCompany().getId() : null)
                .leadId(conversation.getLead() != null ? conversation.getLead().getId() : null)
                .phoneNumber(conversation.getPhoneNumber()).waChatId(conversation.getWaChatId())
                .contactName(WhatsAppConversationDisplayName.resolve(conversation)).profilePictureUrl(conversation.getProfilePictureUrl())
                .unreadCount(conversation.getUnreadCount()).lastMessageText(conversation.getLastMessageText())
                .lastMessageTimestamp(conversation.getLastMessageTimestamp()).isArchived(conversation.getIsArchived())
                .isBlocked(conversation.getIsBlocked()).uazapInstance(conversation.getUazapInstance())
                .supportMode(conversation.getSupportMode()).createdAt(conversation.getCreatedAt())
                .updatedAt(conversation.getUpdatedAt()).build();
    }

    private String buildAgentDocumentsCatalogAppendix(UUID knowledgeBaseId) {
        List<CompanyAgentDocument> docs = knowledgeBaseAgentDocumentRepository
                .findDocumentsByKnowledgeBaseId(knowledgeBaseId);
        if (docs == null || docs.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        sb.append("## Documentos que você pode enviar pelo WhatsApp\n");
        sb.append("Quando for adequado, responda em texto ao usuário. Se for enviar um arquivo desta lista, ")
                .append("coloque na ÚLTIMA linha sozinha exatamente: ATTACH_DOC:<id>\n");
        sb.append("Use apenas um ID abaixo. Não coloque ATTACH_DOC em outras linhas.\n");
        sb.append(
                "Para cada item, respeite a linha «Quando enviar» (definida pelo consultor); só use ATTACH_DOC se a conversa atual se encaixar nessa intenção.\n");
        for (CompanyAgentDocument d : docs) {
            String waType = d.getMimeType() != null && d.getMimeType().toLowerCase().startsWith("image/") ? "image"
                    : "document";
            sb.append("- ").append(d.getId()).append(" | ").append(d.getTitle()).append(" | whatsapp_type=")
                    .append(waType).append("\n");
            if (d.getSendWhenInstructions() != null && !d.getSendWhenInstructions().isBlank()) {
                sb.append("  Quando enviar: ").append(d.getSendWhenInstructions().replace("\r\n", "\n").trim())
                        .append("\n");
            }
        }
        return sb.toString();
    }

    /**
     * Envia arquivo vinculado ao KB da conversa (Uazap + persistência interna do serviço de mídia).
     */
    private void sendKbLinkedAgentDocument(WhatsAppConversation conv, UUID documentId) {
        try {
            KnowledgeBase kb = findKnowledgeBaseForConversation(conv);
            if (kb == null) {
                log.warn("ATTACH_DOC: sem knowledge base para conversa {}", conv.getId());
                return;
            }
            if (!knowledgeBaseAgentDocumentRepository.existsByKnowledgeBaseIdAndDocumentId(kb.getId(), documentId)) {
                log.warn("ATTACH_DOC: documento {} não vinculado ao KB {}", documentId, kb.getId());
                return;
            }
            CompanyAgentDocument doc = companyAgentDocumentRepository.findById(documentId).orElse(null);
            if (doc == null) {
                log.warn("ATTACH_DOC: documento não encontrado {}", documentId);
                return;
            }
            if (!doc.getCompany().getId().equals(conv.getCompany().getId())) {
                log.warn("ATTACH_DOC: documento de outra empresa");
                return;
            }

            if (!aiResponseGuardService.tryRegisterOutboundDocument(conv.getId(), documentId, doc.getPublicUrl())) {
                log.info("ATTACH_DOC ignorado (duplicata recente) doc {} conv {}", documentId, conv.getId());
                return;
            }

            String mediaType = doc.getMimeType() != null && doc.getMimeType().toLowerCase().startsWith("image/")
                    ? "image"
                    : "document";

            UserWhatsAppConnection connection = findConnectionForConversation(conv);
            String instance = conv.getUazapInstance();
            String baseUrl = conv.getUazapBaseUrl();
            String token = conv.getUazapToken();
            if (connection != null) {
                if (instance == null || instance.isEmpty()) {
                    instance = connection.getInstanceName();
                }
                if (baseUrl == null || baseUrl.isEmpty()) {
                    baseUrl = connection.getInstanceBaseUrl();
                }
                if (token == null || token.isEmpty()) {
                    token = connection.getInstanceToken();
                }
            }

            String fileLabel = doc.getOriginalFilename() != null && !doc.getOriginalFilename().isBlank()
                    ? doc.getOriginalFilename()
                    : doc.getTitle();

            SendMediaMessageRequest req = SendMediaMessageRequest.builder()
                    .phoneNumber(conv.getPhoneNumber())
                    .leadId(conv.getLead() != null ? conv.getLead().getId() : null)
                    .mediaUrl(doc.getPublicUrl())
                    .mediaType(mediaType)
                    .mimeType(doc.getMimeType())
                    .fileName(fileLabel)
                    .documentName(doc.getTitle())
                    .uazapInstance(instance)
                    .uazapBaseUrl(baseUrl)
                    .uazapToken(token)
                    .build();

            byte[] fileBytes = fetchAgentDocumentBytes(doc);
            WhatsAppMessage saved;
            if (fileBytes != null && fileBytes.length > 0) {
                log.info("ATTACH_DOC: enviando mídia em base64 ({} bytes) doc {} — mesmo caminho que envio humano no painel",
                        fileBytes.length, documentId);
                saved = uazapService.sendMediaMessage(req, conv.getCompany(), fileBytes);
            } else {
                log.warn(
                        "ATTACH_DOC: download do arquivo falhou ou vazio; tentando envio só com URL pública (pode falhar conforme o provedor WhatsApp) doc {}",
                        documentId);
                saved = uazapService.sendMediaMessage(req, conv.getCompany());
            }
            WhatsAppConversation refreshed = conversationRepository.findByIdWithCompany(conv.getId()).orElse(conv);
            if (saved != null) {
                sendWebSocketUpdate(conv.getCompany().getId(), saved, refreshed);
            }
            log.info("ATTACH_DOC enviado: doc {} conversa {}", documentId, conv.getId());
        } catch (Exception e) {
            log.error("Falha ao enviar ATTACH_DOC {} para {}: {}", documentId, conv.getId(), e.getMessage(), e);
        }
    }

    /**
     * Baixa o arquivo público do storage (ex.: Supabase) para enviar em base64 via API de mídia,
     * evitando depender do provedor WhatsApp acessar a URL externamente.
     */
    private byte[] fetchAgentDocumentBytes(CompanyAgentDocument doc) {
        String publicUrl = doc.getPublicUrl();
        if (publicUrl == null || publicUrl.isBlank()) {
            return null;
        }
        try {
            ResponseEntity<byte[]> response = restTemplate.exchange(
                    publicUrl,
                    HttpMethod.GET,
                    HttpEntity.EMPTY,
                    byte[].class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                log.warn("ATTACH_DOC: HTTP {} ao baixar {}", response.getStatusCode(), publicUrl);
                return null;
            }
            byte[] body = response.getBody();
            if (body.length > MAX_AGENT_DOC_SEND_BYTES) {
                log.warn("ATTACH_DOC: arquivo muito grande ({} bytes); limite {}", body.length, MAX_AGENT_DOC_SEND_BYTES);
                return null;
            }
            return body;
        } catch (Exception e) {
            log.warn("ATTACH_DOC: exceção ao baixar {}: {}", publicUrl, e.getMessage());
            return null;
        }
    }

    /**
     * Resolve qual KB usar para IA: mesma conexão WhatsApp da conversa (instância/token).
     * Não usa fallback para "primeira conexão da empresa" — evita IA sem agente vinculado à instância correta.
     */
    private KnowledgeBase findKnowledgeBaseForConversation(WhatsAppConversation conversation) {
        try {
            UserWhatsAppConnection whatsAppConnection = findConnectionForConversationStrictForAi(conversation);

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

    /**
     * Conexão WhatsApp ligada à conversa (instância ou URL+token), sem assumir outra instância da empresa.
     * Usado para localizar KB/agente; envio de mensagem continua usando {@link #findConnectionForConversation} com fallback.
     */
    private UserWhatsAppConnection findConnectionForConversationStrictForAi(WhatsAppConversation conversation) {
        try {
            String instanceName = conversation.getUazapInstance();
            UUID companyId = conversation.getCompany().getId();

            if (instanceName != null && !instanceName.isEmpty()) {
                var conn = whatsAppConnectionRepository.findByCompanyIdAndInstanceName(companyId, instanceName)
                        .orElse(null);
                if (conn != null) {
                    return conn;
                }
            }

            String baseUrl = conversation.getUazapBaseUrl();
            String token = conversation.getUazapToken();
            if (baseUrl != null && token != null) {
                return whatsAppConnectionRepository.findByInstanceBaseUrlAndInstanceToken(baseUrl, token)
                        .filter(c -> c.getCompany().getId().equals(companyId))
                        .orElse(null);
            }

            return null;

        } catch (Exception e) {
            log.error("Error finding connection (strict) for conversation: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Envia presença ("composing"/"recording"/"paused") para o número da conversa.
     * Resolve baseUrl/token na mesma ordem usada por sendAIResponse (conexão → conversa).
     * Roda em thread separada para não bloquear o fluxo da IA.
     */
    private void sendPresenceForConversation(WhatsAppConversation conversation, String presence, int delayMs) {
        try {
            String phone = conversation.getPhoneNumber();
            if (phone == null || phone.isBlank()) return;

            String baseUrl = null;
            String token = null;
            UserWhatsAppConnection conn = findConnectionForConversation(conversation);
            if (conn != null) {
                baseUrl = conn.getInstanceBaseUrl();
                token = conn.getInstanceToken();
            }
            if (baseUrl == null) baseUrl = conversation.getUazapBaseUrl();
            if (token == null) token = conversation.getUazapToken();
            if (baseUrl == null || token == null) return;

            final String bUrl = baseUrl;
            final String tk = token;
            new Thread(() -> uazapService.setPresence(phone, presence, bUrl, tk, delayMs),
                    "uazapi-presence").start();
        } catch (Exception e) {
            log.debug("[presence] erro silencioso ao enviar {}: {}", presence, e.getMessage());
        }
    }

    private UserWhatsAppConnection findConnectionForConversation(WhatsAppConversation conversation) {
        try {
            String instanceName = conversation.getUazapInstance();
            UUID companyId = conversation.getCompany().getId();

            // 1. Buscar por instanceName (se conversa tiver)
            if (instanceName != null && !instanceName.isEmpty()) {
                var conn = whatsAppConnectionRepository.findByCompanyIdAndInstanceName(companyId, instanceName)
                        .orElse(null);
                if (conn != null) return conn;
            }

            // 2. Buscar por baseUrl+token (se conversa tiver)
            String baseUrl = conversation.getUazapBaseUrl();
            String token = conversation.getUazapToken();
            if (baseUrl != null && token != null) {
                var conn = whatsAppConnectionRepository.findByInstanceBaseUrlAndInstanceToken(baseUrl, token)
                        .filter(c -> c.getCompany().getId().equals(companyId))
                        .orElse(null);
                if (conn != null) return conn;
            }

            // 3. Fallback: primeira conexão ativa da empresa (igual ao fluxo humano)
            return whatsAppConnectionRepository.findByCompanyIdAndIsActiveTrue(companyId).stream()
                    .findFirst()
                    .orElse(null);

        } catch (Exception e) {
            log.error("Error finding connection for conversation: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Verifica se existe agente (KB ativa) vinculado à conexão WhatsApp desta conversa (resolução estrita, sem fallback de instância).
     */
    public boolean hasActiveLinkedKbForConversation(WhatsAppConversation conversation) {
        KnowledgeBase kb = findKnowledgeBaseForConversation(conversation);
        return kb != null && Boolean.TRUE.equals(kb.getIsActive());
    }

    public List<OpenAiService.ChatMessage> getRecentConversationHistory(UUID conversationId, int limit) {
        try {
            // 1. Buscar mensagens ordenadas da mais recente para a mais antiga
            List<WhatsAppMessage> recentMessages = messageRepository
                    .findByConversationIdOrderByMessageTimestampDesc(conversationId).stream().limit(limit)
                    .collect(Collectors.toList());

            String customHandoffMsg = null;
            if (!recentMessages.isEmpty()) {
                try {
                    UUID infoCompanyId = null;
                    var conv = conversationRepository.findById(conversationId).orElse(null);
                    if (conv != null && conv.getCompany() != null) {
                        infoCompanyId = conv.getCompany().getId();
                    }
                    if (infoCompanyId != null) {
                        var globalConfig = globalNotificationService.getConfig(infoCompanyId);
                        if (globalConfig != null) {
                            customHandoffMsg = globalConfig.getHumanHandoffClientMessage();
                        }
                    }
                } catch (Exception ex) {
                    log.warn("Erro ao buscar config de handoff para filtro de histórico: {}", ex.getMessage());
                }
            }

            final String defaultHandoffMsgPrefix = "Entendi! Vou chamar nossa especialista humana";
            final String customHandoffMsgFinal = customHandoffMsg;

            List<OpenAiService.ChatMessage> history = new ArrayList<>();

            // 2. Iterar da MAIS RECENTE para a MAIS ANTIGA
            for (WhatsAppMessage msg : recentMessages) {
                if (msg.getContent() != null && !msg.getContent().isEmpty()) {

                    // Verificação de Handoff (Reset de Contexto)
                    if (Boolean.TRUE.equals(msg.getFromMe())) {
                        boolean isDefaultHandoff = msg.getContent().startsWith(defaultHandoffMsgPrefix);
                        boolean isCustomHandoff = customHandoffMsgFinal != null && !customHandoffMsgFinal.isBlank()
                                && msg.getContent().trim().equals(customHandoffMsgFinal.trim());

                        if (isDefaultHandoff || isCustomHandoff) {
                            log.info(
                                    "Histórico truncado: mensagem de handoff detectada (ID: {}). Ignorando mensagens anteriores.",
                                    msg.getId());
                            break;
                        }
                    }

                    String role = Boolean.TRUE.equals(msg.getFromMe()) ? "assistant" : "user";
                    history.add(new OpenAiService.ChatMessage(role, msg.getContent()));
                }
            }

            // 3. Inverter para ordem cronológica (Antiga -> Recente)
            java.util.Collections.reverse(history);

            return history;

        } catch (Exception e) {
            log.error("Error getting conversation history: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    public boolean isAIEnabledForConversation(WhatsAppConversation conversation) {
        if (conversation == null || conversation.getId() == null) {
            return false;
        }
        WhatsAppConversation conv = conversationRepository.findByIdWithCompany(conversation.getId()).orElse(conversation);
        Company company = conv.getCompany();
        if (company == null) {
            log.info("IA desabilitada para conversa {}: empresa não encontrada.", conversation.getId());
            return false;
        }
        String companyDefault = company.getDefaultSupportMode();
        if (companyDefault == null || !"IA".equalsIgnoreCase(companyDefault.trim())) {
            log.info("IA desabilitada para conversa {}: modo padrão da empresa não é IA (habilite no admin).", conversation.getId());
            return false;
        }
        String sm = conv.getSupportMode();
        if (sm == null || !"IA".equalsIgnoreCase(sm.trim())) {
            log.info("IA desabilitada para conversa {}: conversa em modo humano.", conversation.getId());
            return false;
        }

        if (!openAiService.isChatEnabled()) {
            log.info("IA desabilitada para conversa {}: OpenAI não está habilitada (verifique a chave de API).", conversation.getId());
            return false;
        }

        KnowledgeBase kb = findKnowledgeBaseForConversation(conversation);
        if (kb == null) {
            log.info("IA desabilitada para conversa {}: nenhuma Base de Conhecimento ativa vinculada à instância/conexão WhatsApp desta conversa (sem fallback para outra conexão da empresa).", conversation.getId());
            return false;
        }
        if (!Boolean.TRUE.equals(kb.getIsActive())) {
            log.info("IA desabilitada para conversa {}: Base de Conhecimento '{}' está inativa.", conversation.getId(), kb.getName());
            return false;
        }
        return true;
    }
}
