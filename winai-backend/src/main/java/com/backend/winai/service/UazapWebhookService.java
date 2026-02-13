package com.backend.winai.service;

import com.backend.winai.dto.webhook.UazapWebhookPayload;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.WhatsAppConversation;
import com.backend.winai.entity.WhatsAppMessage;
import com.backend.winai.repository.CompanyRepository;
import com.backend.winai.repository.WhatsAppConversationRepository;
import com.backend.winai.repository.WhatsAppMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.dao.DataIntegrityViolationException;

import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UazapWebhookService {

    private final WhatsAppConversationRepository conversationRepository;
    private final WhatsAppMessageRepository messageRepository;
    private final CompanyRepository companyRepository;

    /**
     * Processa webhook recebido como Map raw (sem tipagem forte).
     * 
     * Formato real do UaZap:
     * {
     *   "BaseUrl": "...",
     *   "EventType": "Message" | "Delivered" | "Read" | ...,
     *   "event": { "Chat": "...", "Sender": "...", "IsFromMe": false, "Message": {...}, "Timestamp": ... },
     *   "instanceName": "nome_instancia",
     *   "owner": "5515991936357",
     *   "token": "...",
     *   "type": "..."
     * }
     */
    @SuppressWarnings("unchecked")
    public void processRawWebhook(Map<String, Object> raw) {
        try {
            // LOG COMPLETO do payload para debug
            try {
                com.fasterxml.jackson.databind.ObjectMapper debugMapper = new com.fasterxml.jackson.databind.ObjectMapper();
                debugMapper.configure(com.fasterxml.jackson.databind.SerializationFeature.FAIL_ON_EMPTY_BEANS, false);
                String fullJson = debugMapper.writeValueAsString(raw);
                log.debug("[WEBHOOK] === PAYLOAD COMPLETO === {}", fullJson);
            } catch (Exception jsonEx) {
                log.info("[WEBHOOK] Payload (toString): {}", raw);
            }

            // Extrair campos do nível raiz
            String eventType = raw.get("EventType") != null ? String.valueOf(raw.get("EventType")) : null;
            String instanceName = raw.get("instanceName") != null ? String.valueOf(raw.get("instanceName")) : null;
            String owner = raw.get("owner") != null ? String.valueOf(raw.get("owner")) : null;
            String rawType = raw.get("type") != null ? String.valueOf(raw.get("type")) : null;

            log.info("[WEBHOOK] EventType: {}, Instance: {}, Owner: {}, type: {}", eventType, instanceName, owner, rawType);

            // Ignorar eventos que não são mensagens novas
            if (eventType != null && !eventType.equalsIgnoreCase("messages")) {
                log.debug("[WEBHOOK] Evento não é mensagem ({}). Ignorando.", eventType);
                return;
            }

            // O UaZap envia dados em 'message' e 'chat' (não em 'event')
            Map<String, Object> messageData = null;
            if (raw.get("message") instanceof Map) {
                messageData = (Map<String, Object>) raw.get("message");
            }

            Map<String, Object> chatData = null;
            if (raw.get("chat") instanceof Map) {
                chatData = (Map<String, Object>) raw.get("chat");
            }

            // Fallback: tentar 'event' se 'message' não existir
            Map<String, Object> eventData = null;
            if (raw.get("event") instanceof Map) {
                eventData = (Map<String, Object>) raw.get("event");
            }

            if (messageData == null && eventData == null) {
                log.warn("[WEBHOOK] Sem message/event data. Keys: {}. Ignorando.", raw.keySet());
                return;
            }

            // === EXTRAIR CAMPOS ===
            // Formato UaZap EventType=messages:
            //   message: { fromMe, sender, senderName, sender_pn, text, messageid, chatid, type, ... }
            //   chat: { wa_chatid, wa_name, name, phone, wa_isGroup, owner, ... }
            // Formato UaZap EventType=messages_update:
            //   event: { IsFromMe, Sender, Chat, MessageIDs, Timestamp, ... }

            Map<String, Object> src = messageData != null ? messageData : eventData;

            // Campos da mensagem
            Boolean isFromMe = getBoolean(src, "fromMe", getBoolean(src, "IsFromMe", null));
            Boolean isGroup = getBoolean(src, "isGroup", getBoolean(chatData, "wa_isGroup", getBoolean(src, "IsGroup", null)));
            String messageId = getStr(src, "messageid", getStr(src, "ID", null));
            String text = getStr(src, "text", getStr(src, "content", null));
            String type = getStr(src, "type", getStr(src, "messageType", null));
            String mediaType = getStr(src, "mediaType", getStr(src, "mimetype", null));
            String mediaUrl = getStr(src, "url", null);
            String caption = getStr(src, "caption", null);
            String status = getStr(src, "status", null);
            Boolean wasSentByApi = getBoolean(src, "wasSentByApi", false);

            // Telefone do contato: usar message.chatid (ex: 554791685019@s.whatsapp.net)
            // message.chatid é SEMPRE o número do contato externo na perspectiva da instância
            // chat.wa_chatid pode ser o owner se o webhook vem de outra instância
            String contactChatId = getStr(src, "chatid", getStr(chatData, "wa_chatid", getStr(src, "Chat", null)));

            // Nome do contato: chat.name ou chat.wa_name
            String contactName = getStr(chatData, "name", getStr(chatData, "wa_name",
                    getStr(src, "senderName", getStr(src, "PushName", null))));

            // MessageIDs pode ser array (formato messages_update)
            if (messageId == null) {
                Object msgIds = src.get("MessageIDs");
                if (msgIds instanceof java.util.List) {
                    java.util.List<?> idList = (java.util.List<?>) msgIds;
                    if (!idList.isEmpty()) {
                        messageId = String.valueOf(idList.get(0));
                    }
                }
            }

            // Timestamp
            Long messageTimestamp = getNumber(src, "messageTimestamp", getNumber(src, "Timestamp", null));

            // Determinar tipo de mensagem
            String msgType = type != null ? normalizeMessageType(type) : "text";

            log.info("[WEBHOOK] Parsed: fromMe={}, contactChatId={}, contactName={}, text={}, msgId={}, type={}, wasSentByApi={}",
                    isFromMe, contactChatId, contactName,
                    text != null ? text.substring(0, Math.min(50, text.length())) : null,
                    messageId, msgType, wasSentByApi);

            // Ignorar mensagens enviadas por API (evitar loops)
            if (Boolean.TRUE.equals(wasSentByApi)) {
                log.debug("[WEBHOOK] Mensagem enviada por API. Ignorando.");
                return;
            }

            // Extrair número do telefone do contato (limpar @s.whatsapp.net)
            String phoneNumber = cleanPhoneNumber(contactChatId);
            if (phoneNumber == null) {
                log.warn("[WEBHOOK] Não foi possível extrair telefone do contato. chatId: {}", contactChatId);
                return;
            }

            // Buscar empresa pela instância ou owner
            Company company = findCompanyByInstance(instanceName != null ? instanceName : owner);
            if (company == null) {
                log.warn("[WEBHOOK] Empresa não encontrada para instância: {}. Usando padrão.", instanceName);
                company = companyRepository.findAll().stream().findFirst().orElse(null);
                if (company == null) {
                    log.error("[WEBHOOK] Nenhuma empresa encontrada no sistema!");
                    return;
                }
            }

            // Buscar ou criar conversa
            WhatsAppConversation conversation = findOrCreateConversation(
                    phoneNumber, company, instanceName, contactName, contactChatId);

            // Verificar duplicata (check rápido, mas pode falhar em concorrência)
            if (messageId != null) {
                Optional<WhatsAppMessage> existing = messageRepository.findByMessageId(messageId);
                if (existing.isPresent()) {
                    log.debug("[WEBHOOK] Mensagem duplicada. MessageId: {}", messageId);
                    return;
                }
            }

            // Conteúdo da mensagem
            String content = text;
            if ((content == null || content.isEmpty()) && caption != null && !caption.isEmpty()) {
                content = caption;
            }
            if (content == null || content.isEmpty()) {
                content = "📎 " + msgType;
            }

            // Criar mensagem (salvar tanto fromMe quanto recebidas)
            WhatsAppMessage message = WhatsAppMessage.builder()
                    .conversation(conversation)
                    .messageId(messageId)
                    .content(content)
                    .fromMe(Boolean.TRUE.equals(isFromMe))
                    .messageType(msgType)
                    .mediaType(mediaType)
                    .mediaUrl(mediaUrl)
                    .messageTimestamp(messageTimestamp)
                    .status(Boolean.TRUE.equals(isFromMe) ? "sent" : "received")
                    .isGroup(Boolean.TRUE.equals(isGroup))
                    .build();

            try {
                messageRepository.saveAndFlush(message);
            } catch (DataIntegrityViolationException e) {
                // Webhook duplicado (outra instância já salvou esta mensagem)
                log.debug("[WEBHOOK] Mensagem duplicada (concurrent). MessageId: {}", messageId);
                return;
            }

            // Atualizar conversa
            if (!Boolean.TRUE.equals(isFromMe)) {
                conversation.setUnreadCount(conversation.getUnreadCount() + 1);
            }
            conversation.setLastMessageText(content);
            conversation.setLastMessageTimestamp(messageTimestamp);
            conversationRepository.saveAndFlush(conversation);

            log.info("[WEBHOOK] ✅ Mensagem salva. Phone: {}, FromMe: {}, Type: {}, Content: {}",
                    phoneNumber, isFromMe, msgType,
                    content.length() > 50 ? content.substring(0, 50) + "..." : content);

        } catch (Exception e) {
            log.error("[WEBHOOK] Erro ao processar webhook", e);
        }
    }

    /**
     * Processa webhook de mensagem recebida do UaZap (método legado com DTO tipado)
     */
    @Transactional
    public void processWebhook(UazapWebhookPayload payload) {
        try {
            log.info("Processando webhook do UaZap. Event: {}, Instance: {}", payload.getEvent(),
                    payload.getInstance());

            // Validar payload
            if (payload.getData() == null) {
                log.warn("Webhook sem dados de mensagem. Ignorando.");
                return;
            }

            UazapWebhookPayload.MessageData messageData = payload.getData();

            // Ignorar mensagens enviadas por API (já foram salvas)
            if (Boolean.TRUE.equals(messageData.getWasSentByApi())) {
                log.debug("Mensagem enviada por API. Ignorando webhook.");
                return;
            }

            // Extrair número do telefone
            String phoneNumber = extractPhoneNumber(messageData);
            if (phoneNumber == null) {
                log.warn("Não foi possível extrair número do telefone. Sender: {}, SenderPn: {}",
                        messageData.getSender(), messageData.getSenderPn());
                return;
            }

            // Buscar empresa pela instância UaZap
            Company company = findCompanyByInstance(payload.getInstance());
            if (company == null) {
                log.warn("Empresa não encontrada para instância: {}. Usando empresa padrão.", payload.getInstance());
                company = companyRepository.findAll().stream().findFirst().orElse(null);
                if (company == null) {
                    log.error("Nenhuma empresa encontrada no sistema!");
                    return;
                }
            }

            // Buscar ou criar conversa
            WhatsAppConversation conversation = findOrCreateConversation(
                    phoneNumber,
                    company,
                    payload.getInstance(),
                    messageData.getSenderName(),
                    messageData.getId());

            // Verificar se mensagem já existe
            Optional<WhatsAppMessage> existingMessage = messageRepository.findByMessageId(messageData.getMessageid());
            if (existingMessage.isPresent()) {
                log.debug("Mensagem já existe no banco. MessageId: {}", messageData.getMessageid());
                return;
            }

            // Criar mensagem
            WhatsAppMessage message = WhatsAppMessage.builder()
                    .conversation(conversation)
                    .messageId(messageData.getMessageid())
                    .content(extractMessageContent(messageData))
                    .fromMe(Boolean.TRUE.equals(messageData.getFromMe()))
                    .messageType(normalizeMessageType(messageData.getType()))
                    .mediaType(messageData.getMediaType())
                    .mediaUrl(extractMediaUrl(messageData))
                    .messageTimestamp(messageData.getMessageTimestamp())
                    .status(messageData.getStatus() != null ? messageData.getStatus() : "received")
                    .isGroup(Boolean.TRUE.equals(messageData.getIsGroup()))
                    .quotedMessageId(extractQuotedMessageId(messageData))
                    .build();

            messageRepository.save(message);

            // Atualizar conversa
            if (!Boolean.TRUE.equals(messageData.getFromMe())) {
                conversation.setUnreadCount(conversation.getUnreadCount() + 1);
            }
            conversation.setLastMessageText(message.getContent());
            conversation.setLastMessageTimestamp(messageData.getMessageTimestamp());
            conversationRepository.save(conversation);

            log.info("Mensagem recebida e salva. From: {}, Type: {}, Content: {}",
                    phoneNumber, message.getMessageType(),
                    message.getContent().length() > 50 ? message.getContent().substring(0, 50) + "..."
                            : message.getContent());

        } catch (Exception e) {
            log.error("Erro ao processar webhook do UaZap", e);
            throw new RuntimeException("Erro ao processar webhook: " + e.getMessage(), e);
        }
    }

    /**
     * Extrai número de telefone do payload
     */
    private String extractPhoneNumber(UazapWebhookPayload.MessageData messageData) {
        // Se for mensagem enviada por mim, usar o owner
        if (Boolean.TRUE.equals(messageData.getFromMe())) {
            // Extrair número do sender (que seria o destinatário neste caso)
            return cleanPhoneNumber(messageData.getSender());
        }

        // Tentar extrair de sender_pn primeiro
        if (messageData.getSenderPn() != null && !messageData.getSenderPn().isEmpty()) {
            return cleanPhoneNumber(messageData.getSenderPn());
        }

        // Fallback para sender
        if (messageData.getSender() != null && !messageData.getSender().isEmpty()) {
            return cleanPhoneNumber(messageData.getSender());
        }

        return null;
    }

    /**
     * Limpa número de telefone removendo sufixos do WhatsApp
     */
    private String cleanPhoneNumber(String phone) {
        if (phone == null)
            return null;

        // Remover sufixos do WhatsApp (@s.whatsapp.net, @lid, @c.us, etc)
        return phone.replaceAll("@.*", "").trim();
    }

    /**
     * Busca empresa pela instância UaZap
     */
    private Company findCompanyByInstance(String instance) {
        // TODO: Implementar busca de empresa por instância
        // Por enquanto, retorna a primeira empresa
        return companyRepository.findAll().stream().findFirst().orElse(null);
    }

    /**
     * Busca ou cria conversa
     */
    private WhatsAppConversation findOrCreateConversation(
            String phoneNumber,
            Company company,
            String instance,
            String contactName,
            String waChatId) {

        Optional<WhatsAppConversation> existing = conversationRepository
                .findByPhoneNumberAndCompany(phoneNumber, company);

        if (existing.isPresent()) {
            WhatsAppConversation conv = existing.get();
            // Atualizar nome do contato se mudou
            if (contactName != null && !contactName.equals("Unknown") && !contactName.equals(conv.getContactName())) {
                conv.setContactName(contactName);
                conversationRepository.save(conv);
            }
            return conv;
        }

        // Criar nova conversa
        WhatsAppConversation newConversation = WhatsAppConversation.builder()
                .company(company)
                .phoneNumber(phoneNumber)
                .waChatId(waChatId)
                .contactName(contactName != null && !contactName.equals("Unknown") ? contactName : phoneNumber)
                .unreadCount(0)
                .isArchived(false)
                .isBlocked(false)
                .uazapInstance(instance)
                .build();

        return conversationRepository.save(newConversation);
    }

    /**
     * Extrai conteúdo da mensagem
     */
    private String extractMessageContent(UazapWebhookPayload.MessageData messageData) {
        // Texto direto
        if (messageData.getText() != null && !messageData.getText().isEmpty()) {
            return messageData.getText();
        }

        // Caption de mídia
        if (messageData.getCaption() != null && !messageData.getCaption().isEmpty()) {
            return messageData.getCaption();
        }

        // Se for mídia sem caption
        if (messageData.getMedia() != null && messageData.getMedia().getCaption() != null) {
            return messageData.getMedia().getCaption();
        }

        // Fallback para tipo de mensagem
        return "📎 " + (messageData.getType() != null ? messageData.getType() : "media");
    }

    /**
     * Normaliza tipo de mensagem
     */
    private String normalizeMessageType(String type) {
        if (type == null)
            return "text";

        switch (type.toLowerCase()) {
            case "text":
            case "extendedtextmessage":
                return "text";
            case "image":
            case "imagemessage":
                return "image";
            case "video":
            case "videomessage":
                return "video";
            case "audio":
            case "audiomessage":
            case "ptt":
                return "audio";
            case "document":
            case "documentmessage":
                return "document";
            case "sticker":
            case "stickermessage":
                return "sticker";
            case "location":
            case "locationmessage":
                return "location";
            case "contact":
            case "contactmessage":
            case "vcard":
                return "contact";
            default:
                return type.toLowerCase();
        }
    }

    /**
     * Extrai URL de mídia
     */
    private String extractMediaUrl(UazapWebhookPayload.MessageData messageData) {
        // URL direta
        if (messageData.getUrl() != null && !messageData.getUrl().isEmpty()) {
            return messageData.getUrl();
        }

        // URL do objeto media
        if (messageData.getMedia() != null && messageData.getMedia().getUrl() != null) {
            return messageData.getMedia().getUrl();
        }

        return null;
    }

    /**
     * Extrai ID da mensagem citada
     */
    private String extractQuotedMessageId(UazapWebhookPayload.MessageData messageData) {
        if (messageData.getQuoted() != null && !messageData.getQuoted().isEmpty()) {
            return messageData.getQuoted();
        }

        if (messageData.getContextInfo() != null && messageData.getContextInfo().getQuotedMessageId() != null) {
            return messageData.getContextInfo().getQuotedMessageId();
        }

        return null;
    }

    // === HELPERS para extração segura de Map ===

    private String getStr(Map<String, Object> map, String key, String defaultValue) {
        if (map == null) return defaultValue;
        Object val = map.get(key);
        if (val == null) return defaultValue;
        String s = String.valueOf(val);
        return s.isEmpty() ? defaultValue : s;
    }

    private Boolean getBoolean(Map<String, Object> map, String key, Boolean defaultValue) {
        if (map == null) return defaultValue;
        Object val = map.get(key);
        if (val instanceof Boolean) return (Boolean) val;
        if (val != null) {
            String s = String.valueOf(val).toLowerCase();
            if ("true".equals(s)) return true;
            if ("false".equals(s)) return false;
        }
        return defaultValue;
    }

    private Long getNumber(Map<String, Object> map, String key, Long defaultValue) {
        if (map == null) return defaultValue;
        Object val = map.get(key);
        if (val instanceof Number) return ((Number) val).longValue();
        if (val != null) {
            try { return Long.parseLong(String.valueOf(val)); } catch (NumberFormatException e) { /* ignore */ }
        }
        return defaultValue;
    }
}
