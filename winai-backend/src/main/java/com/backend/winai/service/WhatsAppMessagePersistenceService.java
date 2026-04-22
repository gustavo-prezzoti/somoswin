package com.backend.winai.service;

import com.backend.winai.entity.Lead;
import com.backend.winai.entity.WhatsAppConversation;
import com.backend.winai.entity.WhatsAppMessage;
import com.backend.winai.repository.LeadRepository;
import com.backend.winai.repository.WhatsAppConversationRepository;
import com.backend.winai.repository.WhatsAppMessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Isola a persistência de {@link WhatsAppMessage} com {@link Propagation#REQUIRES_NEW} para
 * (1) não misturar flush com a sincronização de métricas e (2) permitir tratar
 * chave duplicada no webhook sem abortar a transação principal do PostgreSQL.
 */
@Service
@RequiredArgsConstructor
public class WhatsAppMessagePersistenceService {

    private final WhatsAppMessageRepository messageRepository;
    private final WhatsAppConversationRepository conversationRepository;
    private final LeadRepository leadRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public WhatsAppMessage saveNew(WhatsAppMessage built) {
        return messageRepository.findByMessageId(built.getMessageId())
                .orElseGet(() -> {
                    WhatsAppConversation conv = conversationRepository
                            .getReferenceById(built.getConversation().getId());
                    Lead lead = built.getLead() == null ? null
                            : leadRepository.getReferenceById(built.getLead().getId());
                    WhatsAppMessage toSave = WhatsAppMessage.builder()
                            .conversation(conv)
                            .lead(lead)
                            .messageId(built.getMessageId())
                            .content(built.getContent())
                            .fromMe(built.getFromMe())
                            .messageType(built.getMessageType())
                            .mediaType(built.getMediaType())
                            .mediaUrl(built.getMediaUrl())
                            .mediaDuration(built.getMediaDuration())
                            .messageTimestamp(built.getMessageTimestamp())
                            .status(built.getStatus())
                            .isGroup(built.getIsGroup())
                            .quotedMessageId(built.getQuotedMessageId())
                            .transcription(built.getTranscription())
                            .build();
                    return messageRepository.saveAndFlush(toSave);
                });
    }
}
