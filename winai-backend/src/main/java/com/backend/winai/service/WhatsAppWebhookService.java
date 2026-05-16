package com.backend.winai.service;

import com.backend.winai.dto.request.UazapWebhookRequest;
import com.backend.winai.dto.response.WebSocketMessage;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.Lead;
import com.backend.winai.entity.LeadStatus;
import com.backend.winai.entity.WhatsAppConversation;
import com.backend.winai.entity.WhatsAppMessage;
import com.backend.winai.repository.CompanyRepository;
import com.backend.winai.repository.LeadRepository;
import com.backend.winai.repository.WhatsAppConversationRepository;
import com.backend.winai.util.UtmParseUtil;
import com.backend.winai.util.WhatsAppConversationDisplayName;
import com.backend.winai.repository.WhatsAppMessageRepository;
import com.backend.winai.repository.UserWhatsAppConnectionRepository;
import com.backend.winai.entity.UserWhatsAppConnection;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class WhatsAppWebhookService {

    private final WhatsAppConversationRepository conversationRepository;
    private final WhatsAppMessageRepository messageRepository;
    private final LeadRepository leadRepository;
    private final CompanyRepository companyRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final SupabaseStorageService storageService;
    private final UazapService uazapService;
    private final AIAgentService aiAgentService;
    private final org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
    private final com.backend.winai.queue.AiResponseProducer aiResponseProducer;
    private final UserWhatsAppConnectionRepository userWhatsAppConnectionRepository;
    private final MetricsSyncService metricsSyncService;
    private final FollowUpService followUpService;
    private final OpenAiService openAiService;
    private final LeadAttributionAnchorService leadAttributionAnchorService;

    /**
     * Processa webhook do Uazap recebido via n8n
     * Cria/atualiza conversa, mensagem e lead automaticamente
     */
    @Transactional
    public void processWebhook(UazapWebhookRequest webhook) {
        try {
            // Ignorar apenas se for explicitamente marcado para ignorar (se houver essa
            // flag)
            // A verificação de fromMe foi removida para permitir sincronizar mensagens
            // enviadas pelo celular
            // A duplicidade é tratada verificando o ID da mensagem posteriormente
            if (webhook.getMessage() != null &&
                    Boolean.TRUE.equals(webhook.getMessage().getWasSentByApi())) {
                log.debug("Ignorando eco de mensagem enviada pela API (já salva localmente)");
                return;
            }

            // Ignorar mensagens de grupo
            if (webhook.getChat() != null && Boolean.TRUE.equals(webhook.getChat().getWa_isGroup())) {
                log.debug("Ignorando mensagem de grupo");
                return;
            }

            // Extrair dados do webhook (nome do contato só depois da empresa — para filtrar nome da instância/empresa)
            String phoneNumber = extractPhoneNumber(webhook);
            String messageText = extractMessageText(webhook);
            String messageId = extractMessageId(webhook);
            boolean isFromMe = webhook.getMessage() != null
                    && Boolean.TRUE.equals(webhook.getMessage().getFromMe());
            Long timestamp = extractTimestamp(webhook);
            String messageType = extractMessageType(webhook);

            if (phoneNumber == null || messageText == null || messageId == null) {
                log.warn("Webhook inválido: dados essenciais faltando");
                return;
            }

            // Buscar empresa pela instância/token (ou usar default)
            Company company = findCompanyByWebhook(webhook);
            if (company == null) {
                log.warn("Empresa não encontrada para webhook");
                return;
            }

            String rawContactName = extractContactName(webhook, isFromMe, company);
            // Mensagens enviadas pela instância não devem gravar push/nome da empresa como nome do cliente.
            String contactNameForConversation = isFromMe ? null : rawContactName;

            // Buscar ou criar conversa
            boolean[] wasNewConversation = new boolean[1];
            WhatsAppConversation conversation = findOrCreateConversation(
                    phoneNumber,
                    contactNameForConversation,
                    webhook,
                    company,
                    wasNewConversation);

            // Verificar se mensagem já existe (evitar duplicatas)
            Optional<WhatsAppMessage> existingMessage = messageRepository.findByMessageId(messageId);
            if (existingMessage.isPresent()) {
                log.debug("Mensagem já existe: {}", messageId);
                return;
            }

            // Buscar ou criar lead (nome só a partir de dados do cliente, não fromMe)
            Lead lead = findOrCreateLead(
                    phoneNumber,
                    isFromMe ? null : rawContactName,
                    company,
                    messageText,
                    extractTrackSource(webhook),
                    extractTrackId(webhook),
                    isFromMe,
                    webhook.getInstanceName(),
                    webhook.getOwner());

            // Sincronizar foto de perfil da conversa com o lead
            if (conversation.getProfilePictureUrl() != null &&
                    (lead.getProfilePictureUrl() == null || 
                            !conversation.getProfilePictureUrl().equals(lead.getProfilePictureUrl()))) {
                lead.setProfilePictureUrl(conversation.getProfilePictureUrl());
                lead = leadRepository.save(lead);
            }

            WhatsAppMessage newMessage = WhatsAppMessage.builder()
                    .conversation(conversation)
                    .lead(lead)
                    .messageId(messageId)
                    .content(messageText)
                    .fromMe(isFromMe)
                    .messageType(messageType)
                    .messageTimestamp(timestamp != null ? timestamp : System.currentTimeMillis())
                    .status(isFromMe ? "sent" : "received")
                    .isGroup(false)
                    .build();

            // Processar mídia se houver
            processMedia(newMessage, webhook);

            final WhatsAppMessage message;
            try {
                message = messageRepository.saveAndFlush(newMessage);
            } catch (DataIntegrityViolationException e) {
                if (messageRepository.findByMessageId(messageId).isPresent()) {
                    log.debug("Mensagem duplicada (concorrência ou outra instância): {}", messageId);
                    return;
                }
                throw e;
            }

            // Atualizar conversa
            // Truncar texto se for muito longo (ex: URLs de mídia)
            String lastMsgText = messageText;
            if (lastMsgText != null && lastMsgText.length() > 250) {
                lastMsgText = lastMsgText.substring(0, 247) + "...";
            }
            conversation.setLastMessageText(lastMsgText);
            conversation.setLastMessageTimestamp(message.getMessageTimestamp());
            if (conversation.getUnreadCount() == null) {
                conversation.setUnreadCount(0);
            }
            // Só incrementar unread se a conversa JÁ existia - novas já vêm com unreadCount=1
            if (!isFromMe && !wasNewConversation[0]) {
                conversation.setUnreadCount(conversation.getUnreadCount() + 1);
            }
            if (lead != null && conversation.getLead() == null) {
                conversation.setLead(lead);
            }
            conversation = conversationRepository.save(conversation);

            // Enviar via WebSocket para atualização em tempo real
            sendWebSocketUpdate(company.getId(), message, conversation);

            // Atualizar métricas do dashboard para hoje
            metricsSyncService.syncDashboardMetrics(company, 1);

            log.info("Webhook processado com sucesso. MessageId: {}, Phone: {}, LeadId: {}",
                    messageId, phoneNumber, lead != null ? lead.getId() : null);

            // Atualizar status de follow-up - mensagem recebida do lead
            if (!Boolean.TRUE.equals(message.getFromMe())) {
                try {
                    followUpService.updateLastMessage(conversation.getId(), "LEAD");
                } catch (Exception e) {
                    log.warn("Erro ao atualizar follow-up para conversa {}: {}", conversation.getId(), e.getMessage());
                }

                // Marca a mensagem como lida no WhatsApp do remetente (✓✓ azul).
                // Roda em thread separada pra não atrasar a resposta do webhook ao Uazap.
                try {
                    String mid = message.getMessageId();
                    String baseUrl = conversation.getUazapBaseUrl();
                    String token = conversation.getUazapToken();
                    if (mid != null && baseUrl != null && token != null) {
                        new Thread(() -> uazapService.markMessagesRead(List.of(mid), baseUrl, token),
                                "uazapi-markread").start();
                    }
                } catch (Exception e) {
                    log.debug("Falha ao agendar markread para {}: {}", conversation.getId(), e.getMessage());
                }
            }

            // Processar resposta automática da IA (texto, áudio transcrito ou imagem)
            String typeLowerCheck = messageType != null ? messageType.toLowerCase() : "";
            boolean isText = "text".equalsIgnoreCase(messageType)
                    || "extendedtextmessage".equalsIgnoreCase(messageType);
            boolean isAudio = (typeLowerCheck.contains("audio") || typeLowerCheck.contains("ptt"))
                    && message.getTranscription() != null;
            boolean isImage = typeLowerCheck.contains("image");

            if (!Boolean.TRUE.equals(message.getFromMe()) && (isText || isAudio || isImage)) {
                // Usar o conteúdo da mensagem (que pode ter sido atualizado com a transcrição)
                String imageUrl = isImage ? message.getMediaUrl() : null;
                processAIResponse(conversation, message.getContent(), company, imageUrl);
            } else {
                log.info("IA ignorada: fromMe={} (esperado false), type={} (esperado text, audio transcrito ou imagem)",
                        message.getFromMe(), messageType);
            }
        } catch (Exception e) {
            log.error("Erro ao processar webhook", e);
            throw e;
        }
    }

    /**
     * Envia solicitação de resposta da IA para a fila (Redis)
     */
    private void processAIResponse(WhatsAppConversation conversation, String userMessage, Company company,
            String imageUrl) {
        try {
            if (!aiAgentService.isAIEnabledForConversation(conversation)) {
                // Motivo específico já logado em AIAgentService.isAIEnabledForConversation (modo humano, OpenAI, base, etc.)
                return;
            }

            // Obter nome do lead para contexto
            String leadName = WhatsAppConversationDisplayName.resolve(conversation);
            if (leadName == null || leadName.isBlank()) {
                leadName = "Usuário";
            }

            log.info("Enfileirando processamento de IA para conversa: {}", conversation.getId());

            // Enviar para fila
            com.backend.winai.dto.queue.AiQueueMessage queueMessage = com.backend.winai.dto.queue.AiQueueMessage
                    .builder()
                    .conversationId(conversation.getId().toString())
                    .companyId(company.getId().toString())
                    .userMessage(userMessage)
                    .leadName(leadName)
                    .imageUrl(imageUrl)
                    .timestamp(System.currentTimeMillis())
                    .build();

            boolean queued = aiResponseProducer.sendMessage(queueMessage);

            if (!queued) {
                log.error(
                        "CRÍTICO: Falha ao enfileirar mensagem para IA. A mensagem NÃO será processada para evitar duplicação e race conditions.");
                // NÃO executar fallback síncrono: aiAgentService.processAndRespond(content,
                // userMessage, leadName);
            }

        } catch (Exception e) {
            log.error("Erro no fluxo de IA para conversa {}: {}",
                    conversation.getId(), e.getMessage(), e);
        }
    }

    /**
     * Busca ou cria um lead baseado no telefone; preenche track/UTM quando disponíveis (primeira mensagem / webhook).
     */
    private Lead findOrCreateLead(
            String phoneNumber,
            String contactName,
            Company company,
            String messageText,
            String trackSource,
            String trackId,
            boolean messageFromMe,
            String instanceName,
            String owner) {
        Optional<Lead> existingLead = leadRepository.findByCompanyOrderByCreatedAtDesc(company).stream()
                .filter(lead -> lead.getPhone() != null && phonesMatchForLead(phoneNumber, lead.getPhone()))
                .findFirst();

        Optional<UtmParseUtil.UtmSnapshot> utmFromText = UtmParseUtil.parseFromText(messageText);
        String companyName = company.getName();
        String contratante = company.getContratante();

        if (existingLead.isPresent()) {
            Lead lead = existingLead.get();
            boolean save = false;
            if (contactName != null && !contactName.isEmpty() && !messageFromMe) {
                String cur = lead.getName();
                if (cur == null
                        || cur.isBlank()
                        || WhatsAppConversationDisplayName.isPlaceholderLeadName(cur)
                        || WhatsAppConversationDisplayName.isLikelyNonCustomerLeadName(
                                cur, instanceName, owner, companyName, contratante)) {
                    lead.setName(contactName.trim());
                    save = true;
                }
            }
            if (trackSource != null && (lead.getTrackSource() == null || lead.getTrackSource().isBlank())) {
                lead.setTrackSource(trackSource);
                save = true;
            }
            if (trackId != null && lead.getTrackId() == null) {
                lead.setTrackId(trackId);
                save = true;
            }
            if (utmFromText.isPresent()) {
                save |= mergeUtmIfEmpty(lead, utmFromText.get());
            }
            if (!messageFromMe && messageRepository.countInboundByLeadId(lead.getId()) == 0
                    && needsUtmCampaignForSemantic(lead)) {
                save |= applySemanticAnchorIfPresent(company, messageText, lead);
            }
            if (save) {
                leadRepository.save(lead);
            }
            return lead;
        }

        Lead.LeadBuilder lb = Lead.builder()
                .company(company)
                .name(contactName != null && !contactName.isEmpty() ? contactName : "Lead WhatsApp")
                .email("")
                .phone(phoneNumber)
                .status(LeadStatus.NEW)
                .source("WhatsApp")
                .notes("Lead criado automaticamente via WhatsApp")
                .trackSource(trackSource)
                .trackId(trackId);

        Lead newLead = lb.build();
        utmFromText.ifPresent(u -> applyUtmToLead(newLead, u));
        if (!messageFromMe && needsUtmCampaignForSemantic(newLead)) {
            applySemanticAnchorIfPresent(company, messageText, newLead);
        }
        return leadRepository.save(newLead);
    }

    private static boolean needsUtmCampaignForSemantic(Lead lead) {
        return lead.getUtmCampaign() == null || lead.getUtmCampaign().isBlank();
    }

    private boolean applySemanticAnchorIfPresent(Company company, String messageText, Lead lead) {
        if (messageText == null || messageText.isBlank()) {
            return false;
        }
        String leadRef = lead.getId() != null ? lead.getId().toString() : "novo-lead";
        try {
            log.info(
                    "[SemanticAttr] webhook: primeira mensagem inbound, buscando âncora companyId={} leadRef={}",
                    company.getId(),
                    leadRef);
            Optional<UtmParseUtil.UtmSnapshot> snap = leadAttributionAnchorService.findBestMatch(company.getId(),
                    messageText);
            if (snap.isEmpty()) {
                log.info(
                        "[SemanticAttr] webhook: nenhum snapshot aplicado companyId={} leadRef={}",
                        company.getId(),
                        leadRef);
                return false;
            }
            boolean merged = mergeUtmIfEmpty(lead, snap.get());
            log.info(
                    "[SemanticAttr] webhook: mergeUtmIfEmpty={} companyId={} leadRef={} utm_campaign={}",
                    merged,
                    company.getId(),
                    leadRef,
                    snap.get().getUtmCampaign());
            return merged;
        } catch (Exception e) {
            log.warn(
                    "[SemanticAttr] webhook: erro companyId={} leadRef={}: {}",
                    company.getId(),
                    leadRef,
                    e.getMessage(),
                    e);
            return false;
        }
    }

    private static boolean mergeUtmIfEmpty(Lead lead, UtmParseUtil.UtmSnapshot u) {
        boolean changed = false;
        if (lead.getUtmSource() == null && u.getUtmSource() != null) {
            lead.setUtmSource(u.getUtmSource());
            changed = true;
        }
        if (lead.getUtmMedium() == null && u.getUtmMedium() != null) {
            lead.setUtmMedium(u.getUtmMedium());
            changed = true;
        }
        if (lead.getUtmCampaign() == null && u.getUtmCampaign() != null) {
            lead.setUtmCampaign(u.getUtmCampaign());
            changed = true;
        }
        if (lead.getUtmContent() == null && u.getUtmContent() != null) {
            lead.setUtmContent(u.getUtmContent());
            changed = true;
        }
        if (lead.getUtmTerm() == null && u.getUtmTerm() != null) {
            lead.setUtmTerm(u.getUtmTerm());
            changed = true;
        }
        if (lead.getGclid() == null && u.getGclid() != null) {
            lead.setGclid(u.getGclid());
            changed = true;
        }
        if (lead.getFbclid() == null && u.getFbclid() != null) {
            lead.setFbclid(u.getFbclid());
            changed = true;
        }
        return changed;
    }

    private static void applyUtmToLead(Lead lead, UtmParseUtil.UtmSnapshot u) {
        if (u.getUtmSource() != null) {
            lead.setUtmSource(u.getUtmSource());
        }
        if (u.getUtmMedium() != null) {
            lead.setUtmMedium(u.getUtmMedium());
        }
        if (u.getUtmCampaign() != null) {
            lead.setUtmCampaign(u.getUtmCampaign());
        }
        if (u.getUtmContent() != null) {
            lead.setUtmContent(u.getUtmContent());
        }
        if (u.getUtmTerm() != null) {
            lead.setUtmTerm(u.getUtmTerm());
        }
        if (u.getGclid() != null) {
            lead.setGclid(u.getGclid());
        }
        if (u.getFbclid() != null) {
            lead.setFbclid(u.getFbclid());
        }
    }

    /** Mesmo telefone com ou sem 55 / máscara (evita lead duplicado sem merge de UTM). */
    private static boolean phonesMatchForLead(String webhookPhone, String leadPhone) {
        String a = digitsOnly(webhookPhone);
        String b = digitsOnly(leadPhone);
        if (a.isEmpty() || b.isEmpty()) {
            return false;
        }
        if (a.equals(b)) {
            return true;
        }
        if (a.length() >= 10 && b.length() >= 10) {
            return a.endsWith(b) || b.endsWith(a);
        }
        return false;
    }

    private static String digitsOnly(String p) {
        if (p == null) {
            return "";
        }
        return p.replaceAll("\\D", "");
    }

    private String extractTrackSource(UazapWebhookRequest webhook) {
        if (webhook.getMessage() == null) {
            return null;
        }
        String s = webhook.getMessage().getTrackSource();
        return s != null && !s.isBlank() ? s.trim() : null;
    }

    private String extractTrackId(UazapWebhookRequest webhook) {
        if (webhook.getMessage() == null) {
            return null;
        }
        String s = webhook.getMessage().getTrackId();
        return s != null && !s.isBlank() ? s.trim() : null;
    }

    /**
     * Busca ou cria conversa
     */
    private WhatsAppConversation findOrCreateConversation(
            String phoneNumber,
            String contactName,
            UazapWebhookRequest webhook,
            Company company,
            boolean[] outWasNew) {
        String waChatId = webhook.getChat() != null ? webhook.getChat().getWa_chatid() : null;
        String instanceName = webhook.getInstanceName();
        boolean isNew = false;

        if (waChatId != null && !waChatId.isEmpty()) {
            String derivedFromChat = cleanJid(waChatId);
            if (derivedFromChat != null && derivedFromChat.matches("\\d+")
                    && !derivedFromChat.equals(phoneNumber)) {
                log.warn(
                        "[PhoneMismatch] phone_number={} difere de wa_chatid={} — usando wa_chatid",
                        phoneNumber, derivedFromChat);
                phoneNumber = derivedFromChat;
            }
        }

        WhatsAppConversation conversation;
        Optional<WhatsAppConversation> existing;

        // Buscar conversa por telefone/chatId + empresa + instância
        // Cada instância tem suas próprias conversas separadas
        if (instanceName != null && !instanceName.isEmpty()) {
            // Busca considerando a instância específica
            existing = waChatId != null
                    ? conversationRepository.findByWaChatIdAndCompanyAndUazapInstance(waChatId, company, instanceName)
                    : conversationRepository.findByPhoneNumberAndCompanyAndUazapInstance(phoneNumber, company,
                            instanceName);
        } else {
            // Fallback para busca sem instância (compatibilidade com dados antigos)
            existing = waChatId != null
                    ? conversationRepository.findByWaChatIdAndCompany(waChatId, company)
                    : conversationRepository.findByPhoneNumberAndCompany(phoneNumber, company);
        }

        boolean conversationExisted = existing.isPresent();
        if (conversationExisted) {
            conversation = existing.get();
            if (contactName != null && !contactName.isEmpty()) {
                String current = conversation.getContactName();
                String currentDigits = current == null ? "" : current.replaceAll("\\D", "");
                String phoneDigits = phoneNumber == null ? "" : phoneNumber.replaceAll("\\D", "");
                boolean currentIsPhone = !currentDigits.isEmpty()
                        && !phoneDigits.isEmpty()
                        && currentDigits.equals(phoneDigits);
                boolean currentInvalid = current == null
                        || current.isBlank()
                        || currentIsPhone
                        || WhatsAppConversationDisplayName.isLikelyNonCustomerLeadName(
                                current,
                                instanceName,
                                webhook.getOwner(),
                                company.getName(),
                                company.getContratante());
                if (currentInvalid && !contactName.equals(current)) {
                    log.info("Atualizando contactName da conversa {}: '{}' -> '{}'",
                            conversation.getId(), current, contactName);
                    conversation.setContactName(contactName);
                }
            }
            if (waChatId != null && conversation.getWaChatId() == null) {
                conversation.setWaChatId(waChatId);
            }
            String currentWaChatId = conversation.getWaChatId();
            if (currentWaChatId != null && !currentWaChatId.isEmpty()) {
                String derivedFromChat = cleanJid(currentWaChatId);
                if (derivedFromChat != null && derivedFromChat.matches("\\d+")
                        && !derivedFromChat.equals(conversation.getPhoneNumber())) {
                    log.warn(
                            "[PhoneMismatch] conv {} phone_number={} != wa_chatid={} — corrigindo",
                            conversation.getId(), conversation.getPhoneNumber(), derivedFromChat);
                    conversation.setPhoneNumber(derivedFromChat);
                }
            }
        } else {
            // Criar nova conversa para esta instância
            log.info("Criando nova conversa para telefone {} na instância {}", phoneNumber, instanceName);
            conversation = WhatsAppConversation.builder()
                    .company(company)
                    .phoneNumber(phoneNumber)
                    .waChatId(waChatId)
                    .contactName(contactName)
                    .unreadCount(1)
                    .isArchived(false)
                    .isBlocked(false)
                    .uazapBaseUrl(webhook.getBaseUrl())
                    .uazapToken(webhook.getToken())
                    .uazapInstance(instanceName)
                    .supportMode(company.getDefaultSupportMode() != null ? company.getDefaultSupportMode() : "HUMAN")
                    .build();
            isNew = true;
        }

        // Buscar foto de perfil se não tiver (apenas se tivermos um número de telefone
        // válido)
        if (conversation.getProfilePictureUrl() == null && conversation.getPhoneNumber() != null) {
            try {
                String originalProfileUrl = null;

                // Tenta pegar do webhook primeiro
                if (webhook.getChat() != null) {
                    if (webhook.getChat().getImage() != null && !webhook.getChat().getImage().isEmpty()) {
                        originalProfileUrl = webhook.getChat().getImage();
                    } else if (webhook.getChat().getImagePreview() != null
                            && !webhook.getChat().getImagePreview().isEmpty()) {
                        originalProfileUrl = webhook.getChat().getImagePreview();
                    }
                }

                // Se não veio no webhook, busca na API
                if (originalProfileUrl == null) {
                    originalProfileUrl = uazapService.fetchProfilePictureUrl(
                            conversation.getPhoneNumber(),
                            company,
                            instanceName,
                            webhook.getToken());
                }

                if (originalProfileUrl != null && !originalProfileUrl.isEmpty()) {
                    // Download da imagem
                    try {
                        byte[] imageBytes = restTemplate.getForObject(originalProfileUrl, byte[].class);
                        if (imageBytes != null && imageBytes.length > 0) {
                            // Upload para Supabase Storage
                            String extension = ".jpg";
                            if (originalProfileUrl.toLowerCase().contains(".png"))
                                extension = ".png";

                            String s3Path = "profiles/" + company.getId() + "/" + UUID.randomUUID() + extension;
                            String contentType = extension.equals(".png") ? "image/png" : "image/jpeg";

                            String s3Url = storageService.uploadFileBytes("media", s3Path, imageBytes, contentType);
                            conversation.setProfilePictureUrl(s3Url);
                        }
                    } catch (Exception e) {
                        log.warn("Não foi possível baixar a foto de perfil: {}", e.getMessage());
                    }
                }
            } catch (Exception e) {
                log.warn("Erro ao buscar foto de perfil para {}: {}", conversation.getPhoneNumber(), e.getMessage());
            }
        }

        conversation = conversationRepository.save(conversation);

        if (outWasNew != null) {
            outWasNew[0] = isNew;
        }
        if (isNew) {
            sendWebSocketNewContact(company.getId(), conversation);
        }

        return conversation;
    }

    /**
     * Envia evento de novo contato via WebSocket
     */
    private void sendWebSocketNewContact(UUID companyId, WhatsAppConversation conversation) {
        try {
            WebSocketMessage message = WebSocketMessage.builder()
                    .type("NEW_CONTACT")
                    .conversation(toConversationResponse(conversation))
                    .companyId(companyId)
                    .build();

            messagingTemplate.convertAndSend("/topic/whatsapp/" + companyId, message);
            messagingTemplate.convertAndSend("/topic/whatsapp/conversations/" + companyId, message);
        } catch (Exception e) {
            log.error("Erro ao enviar WebSocket NEW_CONTACT", e);
        }
    }

    /**
     * Envia atualização via WebSocket
     */
    private void sendWebSocketUpdate(UUID companyId, WhatsAppMessage message, WhatsAppConversation conversation) {
        try {
            log.info("Enviando WebSocket para empresa {} - Canal: /topic/whatsapp/{}", companyId, companyId);

            WebSocketMessage wsMessage = WebSocketMessage.builder()
                    .type("NEW_MESSAGE")
                    .message(toMessageResponse(message))
                    .conversation(toConversationResponse(conversation))
                    .companyId(companyId)
                    .build();

            // Enviar para todos os usuários da empresa
            messagingTemplate.convertAndSend("/topic/whatsapp/" + companyId, wsMessage);

            // Também enviar atualização de conversa
            WebSocketMessage convUpdate = WebSocketMessage.builder()
                    .type("CONVERSATION_UPDATED")
                    .conversation(toConversationResponse(conversation))
                    .companyId(companyId)
                    .build();

            messagingTemplate.convertAndSend("/topic/whatsapp/conversations/" + companyId, convUpdate);
            log.info("WebSocket enviado com sucesso para empresa {}", companyId);
        } catch (Exception e) {
            log.error("Erro ao enviar mensagem WebSocket", e);
        }
    }

    private String extractPhoneNumber(UazapWebhookRequest webhook) {
        if (webhook.getChat() != null && webhook.getChat().getWa_chatid() != null
                && !webhook.getChat().getWa_chatid().isEmpty()) {
            return cleanJid(webhook.getChat().getWa_chatid());
        }
        if (webhook.getMessage() != null && webhook.getMessage().getChatid() != null
                && !webhook.getMessage().getChatid().isEmpty()) {
            return cleanJid(webhook.getMessage().getChatid());
        }

        boolean isFromMe = webhook.getMessage() != null
                && Boolean.TRUE.equals(webhook.getMessage().getFromMe());
        if (!isFromMe && webhook.getMessage() != null && webhook.getMessage().getSender_pn() != null) {
            return cleanJid(webhook.getMessage().getSender_pn());
        }
        if (webhook.getChat() != null && webhook.getChat().getPhone() != null) {
            return webhook.getChat().getPhone().replaceAll("[^0-9]", "");
        }
        return null;
    }

    private static String cleanJid(String jid) {
        if (jid == null) {
            return null;
        }
        return jid.replaceAll("@.*", "").trim();
    }

    private String extractMessageText(UazapWebhookRequest webhook) {
        if (webhook.getMessage() == null) {
            return "[Mensagem sem texto]";
        }
        String fromText = extractPlainStringFromPayloadObject(webhook.getMessage().getText());
        if (fromText != null && !fromText.isEmpty()) {
            return fromText;
        }

        Object contentObj = webhook.getMessage().getContent();
        if (contentObj instanceof String s) {
            if (!s.isEmpty()) {
                return s;
            }
        } else if (contentObj instanceof java.util.Map<?, ?> map) {
            String plain = extractTextFromNestedMap(map);
            if (plain != null && !plain.isEmpty()) {
                return plain;
            }
            if (map.containsKey("URL")) {
                return "Mídia: " + map.get("URL");
            }
            return "[Conteúdo Mídia]";
        } else if (contentObj != null) {
            return contentObj.toString();
        }
        return "[Mensagem sem texto]";
    }

    /**
     * UAZAP / Z-API costumam mandar {@code text} como String ou como objeto {@code { "body": "..." }}.
     * {@code Map#toString()} quebrava o parse de UTM na primeira mensagem.
     */
    private static String extractPlainStringFromPayloadObject(Object o) {
        if (o == null) {
            return null;
        }
        if (o instanceof String s) {
            return s.isEmpty() ? null : s;
        }
        if (o instanceof java.util.Map<?, ?> map) {
            return extractTextFromNestedMap(map);
        }
        return null;
    }

    private static String extractTextFromNestedMap(java.util.Map<?, ?> map) {
        for (String key : java.util.List.of("body", "text", "message", "caption", "conversation")) {
            Object v = map.get(key);
            if (v instanceof String s && !s.isEmpty()) {
                return s;
            }
        }
        Object ext = map.get("extendedTextMessage");
        if (ext instanceof java.util.Map<?, ?> em) {
            Object v = em.get("text");
            if (v instanceof String s && !s.isEmpty()) {
                return s;
            }
        }
        return null;
    }

    private String extractMessageId(UazapWebhookRequest webhook) {
        if (webhook.getMessage() != null) {
            String id = webhook.getMessage().getMessageid();
            if (id != null && !id.isEmpty())
                return id;

            id = webhook.getMessage().getId();
            if (id != null && !id.isEmpty())
                return id;
        }
        return null;
    }

    /**
     * Prioriza push do remetente ({@code senderName}); {@code chat.name} costuma repetir o nome da
     * instância/empresa para todos os chats em alguns payloads.
     */
    private String extractContactName(UazapWebhookRequest webhook, boolean messageFromMe, Company company) {
        if (messageFromMe) {
            return null;
        }
        String instanceName = webhook.getInstanceName();
        String owner = webhook.getOwner();
        String companyName = company != null ? company.getName() : null;
        String contratante = company != null ? company.getContratante() : null;

        if (webhook.getMessage() != null && webhook.getMessage().getSenderName() != null) {
            String s = WhatsAppConversationDisplayName.sanitizeInboundContactDisplayName(
                    webhook.getMessage().getSenderName(), instanceName, owner, companyName, contratante);
            if (s != null) {
                return s;
            }
        }
        if (webhook.getChat() != null) {
            String name = webhook.getChat().getLead_fullName();
            if (name != null && !name.isEmpty()) {
                String s = WhatsAppConversationDisplayName.sanitizeInboundContactDisplayName(
                        name, instanceName, owner, companyName, contratante);
                if (s != null) {
                    return s;
                }
            }
            name = webhook.getChat().getWa_name();
            if (name != null && !name.isEmpty()) {
                String s = WhatsAppConversationDisplayName.sanitizeInboundContactDisplayName(
                        name, instanceName, owner, companyName, contratante);
                if (s != null) {
                    return s;
                }
            }
            name = webhook.getChat().getName();
            if (name != null && !name.isEmpty()) {
                String s = WhatsAppConversationDisplayName.sanitizeInboundContactDisplayName(
                        name, instanceName, owner, companyName, contratante);
                if (s != null) {
                    return s;
                }
            }
        }
        return null;
    }

    private Long extractTimestamp(UazapWebhookRequest webhook) {
        if (webhook.getMessage() != null && webhook.getMessage().getMessageTimestamp() != null) {
            return webhook.getMessage().getMessageTimestamp();
        }
        if (webhook.getChat() != null && webhook.getChat().getWa_lastMsgTimestamp() != null) {
            return webhook.getChat().getWa_lastMsgTimestamp();
        }
        return System.currentTimeMillis();
    }

    private String extractMessageType(UazapWebhookRequest webhook) {
        if (webhook.getMessage() != null) {
            String type = webhook.getMessage().getMessageType();

            // Normalizar tipos de texto para "text"
            // - "Conversation" = mensagem de texto simples
            // - "ExtendedTextMessage" = mensagem de texto com contexto/formatação
            if (type != null && (type.equalsIgnoreCase("Conversation") ||
                    type.equalsIgnoreCase("ExtendedTextMessage") ||
                    type.toLowerCase().contains("text"))) {
                return "text";
            }

            if (type != null)
                return type;

            type = webhook.getMessage().getType();
            if (type != null)
                return type;

            type = webhook.getMessage().getMediaType();
            if (type != null)
                return type;
        }
        return "text";
    }

    private Company findCompanyByWebhook(UazapWebhookRequest webhook) {
        String token = webhook.getToken();
        String instanceName = webhook.getInstanceName();
        UUID companyId = null;

        if (token != null && !token.isEmpty()) {
            // Tenta buscar primeiro pelo token/URL que é mais preciso
            Optional<UserWhatsAppConnection> conn = userWhatsAppConnectionRepository
                    .findByInstanceBaseUrlAndInstanceToken(webhook.getBaseUrl(), token);

            if (conn.isPresent()) {
                companyId = conn.get().getCompany().getId();
            }
        }

        if (companyId == null && instanceName != null && !instanceName.isEmpty()) {
            // Tenta buscar pelo nome da instância
            List<UserWhatsAppConnection> conns = userWhatsAppConnectionRepository.findByInstanceName(instanceName);
            if (!conns.isEmpty()) {
                companyId = conns.get(0).getCompany().getId();
            }
        }

        // Se encontrou um companyId, recarrega do banco para ter dados frescos
        // (incluindo defaultSupportMode)
        if (companyId != null) {
            return companyRepository.findById(companyId).orElse(null);
        }

        log.warn(
                "Nenhuma conexão de WhatsApp encontrada para Token: {} ou Instância: {}. Usando fallback para primeira empresa.",
                token, instanceName);

        // Fallback apenas se nada for encontrado, para não quebrar fluxos legados
        return companyRepository.findAll().stream().findFirst().orElse(null);
    }

    /**
     * Converte entidades para DTOs (métodos auxiliares)
     */
    private com.backend.winai.dto.response.WhatsAppMessageResponse toMessageResponse(WhatsAppMessage message) {
        return com.backend.winai.dto.response.WhatsAppMessageResponse.builder()
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

    private com.backend.winai.dto.response.WhatsAppConversationResponse toConversationResponse(
            WhatsAppConversation conversation) {
        return com.backend.winai.dto.response.WhatsAppConversationResponse.builder()
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

    /**
     * Processa a mídia da mensagem usando a API de download da UaZapi
     * A UaZapi retorna o arquivo criptografado na URL direta, precisamos usar
     * o endpoint /message/download para obter o arquivo descriptografado
     */
    /**
     * Processa a mídia da mensagem usando a API de download da UaZapi
     * A UaZapi retorna o arquivo criptografado na URL direta, precisamos usar
     * o endpoint /message/download para obter o arquivo descriptografado
     */
    private void processMedia(WhatsAppMessage message, UazapWebhookRequest webhook) {
        try {
            String originalMimeType = null;
            Object contentObj = webhook.getMessage().getContent();
            String fileName = null;

            // Extrair mimetype, duração e filename do content
            if (contentObj instanceof java.util.Map) {
                java.util.Map<?, ?> map = (java.util.Map<?, ?>) contentObj;
                if (map.containsKey("mimetype")) {
                    originalMimeType = (String) map.get("mimetype");
                }

                if (map.containsKey("fileName")) {
                    fileName = (String) map.get("fileName");
                } else if (map.containsKey("filename")) {
                    fileName = (String) map.get("filename");
                }

                if (map.containsKey("seconds")) {
                    try {
                        Object secondsObj = map.get("seconds");
                        if (secondsObj instanceof Number) {
                            message.setMediaDuration(((Number) secondsObj).intValue());
                        } else if (secondsObj instanceof String) {
                            message.setMediaDuration(Integer.parseInt((String) secondsObj));
                        }
                    } catch (Exception e) {
                        log.warn("Erro ao extrair duração da mídia", e);
                    }
                }
            }

            // Verificar se é uma mensagem de mídia
            String messageType = message.getMessageType();
            if (messageType == null)
                return;

            String typeLower = messageType.toLowerCase();
            boolean isMediaMessage = typeLower.contains("audio") || typeLower.contains("ptt") ||
                    typeLower.contains("image") || typeLower.contains("video") ||
                    typeLower.contains("document") || typeLower.contains("sticker");

            if (!isMediaMessage)
                return;

            // Obter dados necessários para chamar a API de download da UaZapi
            String baseUrl = webhook.getBaseUrl();
            String token = webhook.getToken();
            String messageId = webhook.getMessage().getMessageid();

            if (baseUrl == null || token == null || messageId == null) {
                log.warn("Dados insuficientes para download de mídia: baseUrl={}, token={}, messageId={}",
                        baseUrl, token != null ? "[PRESENTE]" : null, messageId);
                return;
            }

            // Chamar a API de download da UaZapi - tentar múltiplos endpoints
            String[] downloadEndpoints = {
                    baseUrl + "/message/getLink", // Endpoint mais comum
                    baseUrl + "/getLink", // Endpoint alternativo
                    baseUrl + "/message/download" // Outro endpoint possível
            };

            log.info("Tentando baixar mídia via UaZapi - MessageId: {}", messageId);

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            headers.set("token", token);

            // Request body com diferentes formatos de messageId
            java.util.Map<String, Object> requestBody = new java.util.HashMap<>();
            requestBody.put("messageId", messageId);
            // Alguns endpoints podem esperar só o ID sem o prefixo
            if (messageId.contains(":")) {
                requestBody.put("id", messageId.split(":")[1]);
            } else {
                requestBody.put("id", messageId);
            }

            org.springframework.http.HttpEntity<java.util.Map<String, Object>> requestEntity = new org.springframework.http.HttpEntity<>(
                    requestBody, headers);

            byte[] mediaBytes = null;
            String contentType = originalMimeType;

            // Tentar cada endpoint até conseguir
            for (String downloadUrl : downloadEndpoints) {
                if (mediaBytes != null && mediaBytes.length > 0)
                    break;

                try {
                    log.debug("Tentando endpoint: {}", downloadUrl);

                    @SuppressWarnings("rawtypes")
                    org.springframework.http.ResponseEntity<java.util.Map> response = restTemplate.exchange(downloadUrl,
                            org.springframework.http.HttpMethod.POST,
                            requestEntity, java.util.Map.class);

                    if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                        java.util.Map<?, ?> responseBody = response.getBody();
                        log.info("Resposta do endpoint {}: {}", downloadUrl, responseBody.keySet());

                        // Tentar extrair base64 de diferentes campos
                        String base64 = null;
                        if (responseBody.containsKey("base64")) {
                            base64 = (String) responseBody.get("base64");
                        } else if (responseBody.containsKey("data")) {
                            Object dataObj = responseBody.get("data");
                            if (dataObj instanceof String) {
                                base64 = (String) dataObj;
                            } else if (dataObj instanceof java.util.Map) {
                                java.util.Map<?, ?> dataMap = (java.util.Map<?, ?>) dataObj;
                                if (dataMap.containsKey("base64")) {
                                    base64 = (String) dataMap.get("base64");
                                }
                            }
                        } else if (responseBody.containsKey("file")) {
                            base64 = (String) responseBody.get("file");
                        }

                        if (base64 != null && !base64.isEmpty()) {
                            // Remover prefixo data:... se existir
                            if (base64.contains(",")) {
                                base64 = base64.split(",")[1];
                            }
                            // Remover espaços/quebras de linha que podem corromper o base64
                            base64 = base64.replaceAll("\\s", "");
                            mediaBytes = java.util.Base64.getDecoder().decode(base64);
                            log.info("Mídia obtida via base64 do endpoint {}: {} bytes", downloadUrl,
                                    mediaBytes.length);
                        }

                        // Tentar URL direta se não tiver base64
                        if ((mediaBytes == null || mediaBytes.length == 0)) {
                            String directUrl = null;
                            if (responseBody.containsKey("fileURL")) {
                                directUrl = (String) responseBody.get("fileURL");
                            } else if (responseBody.containsKey("url")) {
                                directUrl = (String) responseBody.get("url");
                            } else if (responseBody.containsKey("link")) {
                                directUrl = (String) responseBody.get("link");
                            } else if (responseBody.containsKey("downloadUrl")) {
                                directUrl = (String) responseBody.get("downloadUrl");
                            }

                            if (directUrl != null && !directUrl.isEmpty()) {
                                try {
                                    mediaBytes = restTemplate.getForObject(directUrl, byte[].class);
                                    log.info("Mídia obtida via URL direta: {} bytes",
                                            mediaBytes != null ? mediaBytes.length : 0);
                                } catch (Exception urlEx) {
                                    log.warn("Falha ao baixar da URL {}: {}", directUrl, urlEx.getMessage());
                                }
                            }
                        }

                        // Verificar se retornou mimetype
                        if (responseBody.containsKey("mimetype")) {
                            contentType = (String) responseBody.get("mimetype");
                        }
                    }
                } catch (org.springframework.web.client.HttpClientErrorException.NotFound e404) {
                    log.debug("Endpoint {} não encontrado (404)", downloadUrl);
                } catch (Exception e) {
                    log.debug("Endpoint {} falhou: {}", downloadUrl, e.getMessage());
                }
            }

            // Fallback: tentar download direto da URL
            if ((mediaBytes == null || mediaBytes.length == 0) && contentObj instanceof java.util.Map) {
                java.util.Map<?, ?> map = (java.util.Map<?, ?>) contentObj;
                String directUrl = (String) map.get("URL");
                if (directUrl != null) {
                    log.warn("Tentando download direto da URL (fallback): {}", directUrl);
                    try {
                        mediaBytes = restTemplate.getForObject(directUrl, byte[].class);
                        log.info("Mídia obtida via URL direta (fallback): {} bytes",
                                mediaBytes != null ? mediaBytes.length : 0);
                    } catch (Exception ex) {
                        log.warn("Fallback de download também falhou: {}", ex.getMessage());
                    }
                }
            }

            if (mediaBytes != null && mediaBytes.length > 0) {
                // Determinar contentType e extensão
                if (contentType == null || contentType.isEmpty()) {
                    contentType = getContentTypeFromType(messageType);
                } else if (contentType.contains(";")) {
                    contentType = contentType.split(";")[0].trim();
                }

                boolean isOpus = originalMimeType != null && originalMimeType.toLowerCase().contains("opus");
                String extension = getExtensionFromMimeTypeOrType(contentType, messageType, fileName);

                if (isOpus && (extension.equals(".ogg") || extension.equals(".dat"))) {
                    extension = ".opus";
                }

                String s3Path = "conversations/" + message.getConversation().getId() + "/" + UUID.randomUUID()
                        + extension;

                log.info("Upload de mídia: Type={}, Extension={}, Size={} bytes, Duration={}s",
                        contentType, extension, mediaBytes.length, message.getMediaDuration());

                String s3Url = storageService.uploadFileBytes("media", s3Path, mediaBytes, contentType);

                message.setMediaUrl(s3Url);
                message.setMediaType(contentType);

                // TRANSCRIÇÃO DE ÁUDIO (Novo fluxo)
                if (typeLower.contains("audio") || typeLower.contains("ptt")) {
                    try {
                        String transcription = openAiService.transcribeAudio(mediaBytes, "audio" + extension);
                        if (transcription != null && !transcription.isEmpty()) {
                            message.setTranscription(transcription);
                            message.setContent(transcription); // Atualiza o conteúdo visual com o texto transcrito
                            log.info("Áudio transcrito com sucesso: {}", transcription);
                        } else {
                            message.setContent("[Áudio sem transcrição]");
                        }
                    } catch (Exception e) {
                        log.error("Erro ao transcrever áudio no fluxo: {}", e.getMessage());
                        message.setContent("[Erro na transcrição de áudio]");
                    }
                }

                // Limpar o content se for apenas a URL bruta do WhatsApp
                if (message.getContent() != null
                        && message.getContent().startsWith("Mídia: https://mmg.whatsapp.net")) {
                    String lowerType = messageType.toLowerCase();
                    if (lowerType.contains("audio") || lowerType.contains("ptt")) {
                        message.setContent("Áudio");
                    } else if (lowerType.contains("image")) {
                        message.setContent("Imagem");
                    } else if (lowerType.contains("video")) {
                        message.setContent("Vídeo");
                    } else if (lowerType.contains("document")) {
                        message.setContent("Documento");
                    } else {
                        message.setContent("Arquivo");
                    }
                }
            } else {
                log.warn("Não foi possível obter os bytes da mídia para messageId: {}", messageId);
            }
        } catch (Exception e) {
            log.error("Erro ao processar arquivo de mídia", e);
        }
    }

    private String getContentTypeFromType(String type) {
        if (type == null)
            return "application/octet-stream";
        String lower = type.toLowerCase();
        if (lower.contains("image"))
            return "image/jpeg";
        if (lower.contains("audio") || lower.contains("ptt"))
            return "audio/ogg";
        if (lower.contains("video"))
            return "video/mp4";
        return "application/octet-stream";
    }

    private String getExtensionFromMimeTypeOrType(String mimeType, String messageType, String fileName) {
        // Tentar obter extensão do nome do arquivo original (PRIORIDADE ALTA)
        if (fileName != null && fileName.contains(".")) {
            String ext = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();
            if (ext.matches("^\\.[a-z0-9]+$")) {
                return ext;
            }
        }

        if (mimeType != null && !mimeType.isEmpty()) {
            if (mimeType.contains("image/jpeg") || mimeType.contains("image/jpg"))
                return ".jpg";
            if (mimeType.contains("image/png"))
                return ".png";
            if (mimeType.contains("image/webp"))
                return ".webp";
            if (mimeType.contains("audio/mp4"))
                return ".m4a";
            if (mimeType.contains("audio/mpeg"))
                return ".mp3";
            if (mimeType.contains("audio/ogg"))
                return ".ogg";
            if (mimeType.contains("video/mp4"))
                return ".mp4";
            if (mimeType.contains("application/pdf"))
                return ".pdf";
            if (mimeType.contains("text/plain"))
                return ".txt";
            if (mimeType.contains("application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
                return ".docx";
            if (mimeType.contains("application/msword"))
                return ".doc";
            if (mimeType.contains("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                return ".xlsx";
            if (mimeType.contains("application/vnd.ms-excel"))
                return ".xls";
            if (mimeType.contains("text/csv") || mimeType.contains("application/csv"))
                return ".csv";
            if (mimeType.contains("application/zip"))
                return ".zip";
            if (mimeType.contains("application/rar") || mimeType.contains("application/x-rar-compressed"))
                return ".rar";
        }

        if (messageType == null)
            return ".dat";
        String lower = messageType.toLowerCase();
        if (lower.contains("image"))
            return ".jpg";
        if (lower.contains("audio") || lower.contains("ptt"))
            return ".ogg";
        if (lower.contains("video"))
            return ".mp4";
        if (lower.contains("document"))
            return ".dat"; // Safe default avoiding PDF assumption

        return ".dat";
    }
}
