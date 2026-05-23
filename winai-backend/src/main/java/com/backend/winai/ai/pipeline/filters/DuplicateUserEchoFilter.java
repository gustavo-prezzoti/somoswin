package com.backend.winai.ai.pipeline.filters;

import com.backend.winai.ai.pipeline.config.AiPipelineProperties;
import com.backend.winai.ai.pipeline.model.AiPayload;
import com.backend.winai.entity.WhatsAppMessage;
import com.backend.winai.repository.WhatsAppMessageRepository;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Detecta "echo duplicado do usuário" — caso típico em que o app/WhatsApp
 * reenvia o webhook de uma mesma mensagem do lead. Regra:
 *  - Texto IDÊNTICO ao último turno do lead no histórico (ignora case+espaço),
 *  - Com pelo menos {@code duplicate-user-echo-min-runes} caracteres,
 *  - Em menos de {@code duplicate-user-echo-max-age-ms} desde o anterior.
 *
 * Não vale para mensagens com mídia (essas precisam reprocessamento).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DuplicateUserEchoFilter {

    private final AiPipelineProperties props;
    private final WhatsAppMessageRepository messageRepository;

    /** @return true se for um echo duplicado e deve ser descartado. */
    public boolean shouldSkip(AiPayload payload) {
        if (payload == null) return false;
        if (payload.hasMedia()) return false;
        if (!payload.hasText()) return false;

        String text = payload.getMessageText().trim();
        if (text.codePointCount(0, text.length()) < props.getDuplicateUserEchoMinRunes()) {
            return false;
        }
        if (payload.getConversationId() == null) return false;

        UUID convId;
        try {
            convId = UUID.fromString(payload.getConversationId());
        } catch (Exception e) {
            return false;
        }

        try {
            List<WhatsAppMessage> recent = messageRepository
                    .findByConversationIdOrderByMessageTimestampDesc(convId)
                    .stream()
                    .limit(5)
                    .toList();
            long cutoff = System.currentTimeMillis() - props.getDuplicateUserEchoMaxAgeMs();
            String norm = normalize(text);
            for (WhatsAppMessage m : recent) {
                if (Boolean.TRUE.equals(m.getFromMe())) continue;
                if (m.getContent() == null) continue;
                if (m.getMessageTimestamp() != null && m.getMessageTimestamp() < cutoff) continue;
                if (norm.equals(normalize(m.getContent()))) {
                    log.info("[echo] descartando duplicata recente do lead conv={}", convId);
                    return true;
                }
            }
        } catch (Exception e) {
            log.debug("DuplicateUserEchoFilter erro: {}", e.getMessage());
        }
        return false;
    }

    private static String normalize(String s) {
        return s.trim().replaceAll("\\s+", " ").toLowerCase();
    }
}
