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
     * Isso evita erros de deserialização quando o UaZap envia campos com tipos variáveis.
     */
    @Transactional
    @SuppressWarnings("unchecked")
    public void processRawWebhook(Map<String, Object> raw) {
        try {
            // Extrair event (pode ser String ou Object)
            String event = null;
            Object eventObj = raw.get("event");
            if (eventObj instanceof String) {
                event = (String) eventObj;
            } else if (eventObj instanceof Map) {
                // event é um objeto, tentar extrair "event" de dentro ou usar toString
                Map<String, Object> eventMap = (Map<String, Object>) eventObj;
                event = eventMap.containsKey("event") ? String.valueOf(eventMap.get("event")) : eventObj.toString();
            } else if (eventObj != null) {
                event = eventObj.toString();
            }

            String instance = raw.get("instance") != null ? String.valueOf(raw.get("instance")) : null;
            String owner = raw.get("owner") != null ? String.valueOf(raw.get("owner")) : null;

            log.info("[WEBHOOK] Processando. Event: {}, Instance: {}, Owner: {}", event, instance, owner);

            // Extrair data (pode ser Map)
            Map<String, Object> data = null;
            if (raw.get("data") instanceof Map) {
                data = (Map<String, Object>) raw.get("data");
            }

            if (data == null) {
                log.warn("[WEBHOOK] Sem dados de mensagem (data=null). Keys: {}. Ignorando.", raw.keySet());
                return;
            }

            // Extrair campos do data
            Boolean fromMe = data.get("fromMe") instanceof Boolean ? (Boolean) data.get("fromMe") : null;
            Boolean wasSentByApi = data.get("wasSentByApi") instanceof Boolean ? (Boolean) data.get("wasSentByApi") : null;
            Boolean isGroup = data.get("isGroup") instanceof Boolean ? (Boolean) data.get("isGroup") : null;
            String sender = data.get("sender") != null ? String.valueOf(data.get("sender")) : null;
            String senderPn = data.get("sender_pn") != null ? String.valueOf(data.get("sender_pn")) : null;
            String senderName = data.get("senderName") != null ? String.valueOf(data.get("senderName")) : null;
            String text = data.get("text") != null ? String.valueOf(data.get("text")) : null;
            String messageId = data.get("messageid") != null ? String.valueOf(data.get("messageid")) : null;
            String id = data.get("id") != null ? String.valueOf(data.get("id")) : null;
            String type = data.get("type") != null ? String.valueOf(data.get("type")) : null;
            String mediaType = data.get("mediaType") != null ? String.valueOf(data.get("mediaType")) : null;
            String mediaUrl = data.get("url") != null ? String.valueOf(data.get("url")) : null;
            String caption = data.get("caption") != null ? String.valueOf(data.get("caption")) : null;
            String status = data.get("status") != null ? String.valueOf(data.get("status")) : null;
            Long messageTimestamp = null;
            if (data.get("messageTimestamp") instanceof Number) {
                messageTimestamp = ((Number) data.get("messageTimestamp")).longValue();
            }

            log.info("[WEBHOOK] Data: fromMe={}, sender={}, senderName={}, text={}, msgId={}, type={}",
                    fromMe, sender, senderName,
                    text != null ? text.substring(0, Math.min(50, text.length())) : null,
                    messageId, type);

            // Ignorar mensagens enviadas por API
            if (Boolean.TRUE.equals(wasSentByApi)) {
                log.debug("[WEBHOOK] Mensagem enviada por API. Ignorando.");
                return;
            }

            // Extrair número do telefone
            String phoneNumber = null;
            if (senderPn != null && !senderPn.isEmpty()) {
                phoneNumber = cleanPhoneNumber(senderPn);
            } else if (sender != null && !sender.isEmpty()) {
                phoneNumber = cleanPhoneNumber(sender);
            }

            if (phoneNumber == null) {
                log.warn("[WEBHOOK] Não foi possível extrair telefone. Sender: {}, SenderPn: {}", sender, senderPn);
                return;
            }

            // Buscar empresa pela instância ou owner
            Company company = findCompanyByInstance(instance != null ? instance : owner);
            if (company == null) {
                log.warn("[WEBHOOK] Empresa não encontrada para instância: {}. Usando padrão.", instance);
                company = companyRepository.findAll().stream().findFirst().orElse(null);
                if (company == null) {
                    log.error("[WEBHOOK] Nenhuma empresa encontrada no sistema!");
                    return;
                }
            }

            // Buscar ou criar conversa
            WhatsAppConversation conversation = findOrCreateConversation(
                    phoneNumber, company, instance, senderName, id);

            // Verificar duplicata
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
                content = "📎 " + (type != null ? type : "media");
            }

            // Criar mensagem
            WhatsAppMessage message = WhatsAppMessage.builder()
                    .conversation(conversation)
                    .messageId(messageId)
                    .content(content)
                    .fromMe(Boolean.TRUE.equals(fromMe))
                    .messageType(normalizeMessageType(type))
                    .mediaType(mediaType)
                    .mediaUrl(mediaUrl)
                    .messageTimestamp(messageTimestamp)
                    .status(status != null ? status : "received")
                    .isGroup(Boolean.TRUE.equals(isGroup))
                    .build();

            messageRepository.save(message);

            // Atualizar conversa
            if (!Boolean.TRUE.equals(fromMe)) {
                conversation.setUnreadCount(conversation.getUnreadCount() + 1);
            }
            conversation.setLastMessageText(content);
            conversation.setLastMessageTimestamp(messageTimestamp);
            conversationRepository.save(conversation);

            log.info("[WEBHOOK] ✅ Mensagem salva. From: {}, Type: {}, Content: {}",
                    phoneNumber, message.getMessageType(),
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
}
