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

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UazapWebhookService {

    private final WhatsAppConversationRepository conversationRepository;
    private final WhatsAppMessageRepository messageRepository;
    private final CompanyRepository companyRepository;

    /**
     * Processa webhook de mensagem recebida do UaZap
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
                // Buscar primeira empresa como fallback
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
