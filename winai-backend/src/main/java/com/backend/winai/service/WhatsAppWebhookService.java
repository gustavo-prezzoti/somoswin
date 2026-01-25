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
import com.backend.winai.repository.WhatsAppMessageRepository;
import com.backend.winai.repository.UserWhatsAppConnectionRepository;
import com.backend.winai.entity.UserWhatsAppConnection;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
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
    private final OpenAiService openAiService;

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

            // Extrair dados do webhook
            String phoneNumber = extractPhoneNumber(webhook);
            String messageText = extractMessageText(webhook);
            String messageId = extractMessageId(webhook);
            String contactName = extractContactName(webhook);
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

            // Buscar ou criar conversa
            WhatsAppConversation conversation = findOrCreateConversation(
                    phoneNumber,
                    contactName,
                    webhook,
                    company);

            // Verificar se mensagem já existe (evitar duplicatas)
            Optional<WhatsAppMessage> existingMessage = messageRepository.findByMessageId(messageId);
            if (existingMessage.isPresent()) {
                log.debug("Mensagem já existe: {}", messageId);
                return;
            }

            // Buscar ou criar lead
            // Buscar ou criar lead
            Lead lead = findOrCreateLead(phoneNumber, contactName, company, messageText);

            // Sincronizar foto de perfil da conversa com o lead
            if (conversation.getProfilePictureUrl() != null &&
                    (lead.getProfilePictureUrl() == null ||
                            !conversation.getProfilePictureUrl().equals(lead.getProfilePictureUrl()))) {
                lead.setProfilePictureUrl(conversation.getProfilePictureUrl());
                lead = leadRepository.save(lead);
            }

            // Criar mensagem
            WhatsAppMessage message = WhatsAppMessage.builder()
                    .conversation(conversation)
                    .lead(lead)
                    .messageId(messageId)
                    .content(messageText)
                    .fromMe(false)
                    .messageType(messageType)
                    .messageTimestamp(timestamp != null ? timestamp : System.currentTimeMillis())
                    .status("received")
                    .isGroup(false)
                    .build();

            // Processar mídia se houver
            processMedia(message, webhook);

            message = messageRepository.save(message);

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
            conversation.setUnreadCount(conversation.getUnreadCount() + 1);
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

            // Processar resposta automática da IA (texto ou áudio transcrito)
            boolean isText = "text".equalsIgnoreCase(messageType);
            boolean isAudio = ("audio".equalsIgnoreCase(messageType) || "ptt".equalsIgnoreCase(messageType))
                    && message.getTranscription() != null;

            if (!Boolean.TRUE.equals(message.getFromMe()) && (isText || isAudio)) {
                // Usar o conteúdo da mensagem (que pode ter sido atualizado com a transcrição)
                processAIResponse(conversation, message.getContent(), company);
            } else {
                log.info("IA ignorada: fromMe={} (esperado false), type={} (esperado text ou audio transcrito)",
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
    private void processAIResponse(WhatsAppConversation conversation, String userMessage, Company company) {
        try {
            if (!aiAgentService.isAIEnabledForConversation(conversation)) {
                log.debug("AI não está habilitada para esta conversa: {}", conversation.getId());
                return;
            }

            // Obter nome do lead para contexto
            String leadName = "Usuário";
            if (conversation.getLead() != null && conversation.getLead().getName() != null) {
                leadName = conversation.getLead().getName();
            } else if (conversation.getContactName() != null) {
                leadName = conversation.getContactName();
            }

            log.info("Enfileirando processamento de IA para conversa: {}", conversation.getId());

            // Enviar para fila
            com.backend.winai.dto.queue.AiQueueMessage queueMessage = com.backend.winai.dto.queue.AiQueueMessage
                    .builder()
                    .conversationId(conversation.getId().toString())
                    .companyId(company.getId().toString())
                    .userMessage(userMessage)
                    .leadName(leadName)
                    .timestamp(System.currentTimeMillis())
                    .build();

            boolean queued = aiResponseProducer.sendMessage(queueMessage);

            if (!queued) {
                log.warn("Falha ao enfileirar (Redis indisponível?). Executando processamento síncrono (fallback).");
                aiAgentService.processAndRespond(conversation, userMessage, leadName);
            }

        } catch (Exception e) {
            log.error("Erro no fluxo de IA para conversa {}: {}",
                    conversation.getId(), e.getMessage(), e);
        }
    }

    /**
     * Busca ou cria um lead baseado no telefone
     */
    private Lead findOrCreateLead(String phoneNumber, String contactName, Company company, String messageText) {
        // Buscar lead existente por telefone
        Optional<Lead> existingLead = leadRepository.findByCompanyOrderByCreatedAtDesc(company).stream()
                .filter(lead -> phoneNumber.equals(lead.getPhone()))
                .findFirst();

        if (existingLead.isPresent()) {
            Lead lead = existingLead.get();
            // Atualizar nome se não tiver ou se o novo nome for mais completo
            if (contactName != null && !contactName.isEmpty()) {
                if (lead.getName() == null || lead.getName().isEmpty() ||
                        contactName.length() > lead.getName().length()) {
                    lead.setName(contactName);
                    leadRepository.save(lead);
                }
            }
            return lead;
        }

        // Criar novo lead
        Lead newLead = Lead.builder()
                .company(company)
                .name(contactName != null && !contactName.isEmpty() ? contactName : "Lead WhatsApp")
                .email("") // Será preenchido depois se disponível
                .phone(phoneNumber)
                .status(LeadStatus.NEW)
                .source("WhatsApp")
                .notes("Lead criado automaticamente via WhatsApp")
                .build();

        return leadRepository.save(newLead);
    }

    /**
     * Busca ou cria conversa
     */
    private WhatsAppConversation findOrCreateConversation(
            String phoneNumber,
            String contactName,
            UazapWebhookRequest webhook,
            Company company) {
        String waChatId = webhook.getChat() != null ? webhook.getChat().getWa_chatid() : null;
        String instanceName = webhook.getInstanceName();
        boolean isNew = false;

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

        if (existing.isPresent()) {
            conversation = existing.get();
            // Atualizar nome do contato se necessário
            if (contactName != null && !contactName.isEmpty() &&
                    (conversation.getContactName() == null || conversation.getContactName().isEmpty())) {
                conversation.setContactName(contactName);
            }
            if (waChatId != null && conversation.getWaChatId() == null) {
                conversation.setWaChatId(waChatId);
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
                    .supportMode(company.getDefaultSupportMode() != null ? company.getDefaultSupportMode() : "IA")
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

    /**
     * Métodos auxiliares para extrair dados do webhook
     */
    private String extractPhoneNumber(UazapWebhookRequest webhook) {
        if (webhook.getMessage() != null && webhook.getMessage().getSender_pn() != null) {
            String senderPn = webhook.getMessage().getSender_pn();
            return senderPn.replace("@s.whatsapp.net", "").replace("@c.us", "");
        }
        if (webhook.getChat() != null && webhook.getChat().getPhone() != null) {
            return webhook.getChat().getPhone().replaceAll("[^0-9]", "");
        }
        return null;
    }

    private String extractMessageText(UazapWebhookRequest webhook) {
        if (webhook.getMessage() != null) {
            Object textObj = webhook.getMessage().getText();
            if (textObj instanceof String) {
                String text = (String) textObj;
                if (!text.isEmpty())
                    return text;
            } else if (textObj != null) {
                return textObj.toString();
            }

            Object contentObj = webhook.getMessage().getContent();
            if (contentObj instanceof String) {
                String content = (String) contentObj;
                if (!content.isEmpty())
                    return content;
            } else if (contentObj instanceof java.util.Map) {
                // É um objeto de midia, tenta extrair URL ou algo util
                java.util.Map<?, ?> map = (java.util.Map<?, ?>) contentObj;
                if (map.containsKey("URL")) {
                    return "Mídia: " + map.get("URL");
                }
                return "[Conteúdo Mídia]";
            } else if (contentObj != null) {
                return contentObj.toString();
            }
        }
        return "[Mensagem sem texto]";
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
        return UUID.randomUUID().toString();
    }

    private String extractContactName(UazapWebhookRequest webhook) {
        if (webhook.getChat() != null) {
            String name = webhook.getChat().getLead_fullName();
            if (name != null && !name.isEmpty())
                return name;

            name = webhook.getChat().getWa_name();
            if (name != null && !name.isEmpty())
                return name;

            name = webhook.getChat().getName();
            if (name != null && !name.isEmpty())
                return name;
        }
        if (webhook.getMessage() != null && webhook.getMessage().getSenderName() != null) {
            return webhook.getMessage().getSenderName();
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
                .contactName(conversation.getContactName())
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
