package com.backend.winai.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import java.util.UUID;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import com.backend.winai.repository.WhatsAppMessageRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Guarda central contra duplicação de webhooks inbound e envios outbound da IA.
 * Usa Redis (distribuído entre pods) + consultas recentes no banco.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiResponseGuardService {

    private static final Duration MESSAGE_ID_TTL = Duration.ofHours(48);
    private static final Duration INBOUND_FP_TTL = Duration.ofMinutes(5);
    private static final Duration PROCESSING_LOCK_TTL = Duration.ofMinutes(4);
    private static final Duration DEBOUNCE_GEN_TTL = Duration.ofMinutes(10);
    private static final long INBOUND_FP_BUCKET_MS = 30_000L;
    private static final long RECENT_DB_WINDOW_MS = 120_000L;

    private final StringRedisTemplate redisTemplate;
    private final WhatsAppMessageRepository messageRepository;

    public String resolveMessageId(String messageid, String id) {
        String primary = blankToNull(messageid);
        String secondary = blankToNull(id);

        if (primary != null && secondary != null && !primary.equals(secondary)) {
            linkMessageIdAlias(primary, secondary);
            linkMessageIdAlias(secondary, primary);
        }
        return primary != null ? primary : secondary;
    }

    /**
     * @return true se a mensagem inbound deve ser processada; false se for duplicata.
     */
    public boolean shouldProcessInbound(UUID conversationId, String content, Long timestamp, String messageId) {
        if (messageId == null || messageId.isBlank()) {
            return false;
        }

        String canonical = resolveCanonicalMessageId(messageId);

        if (messageRepository.findByMessageId(canonical).isPresent()
                || messageRepository.findByMessageId(messageId).isPresent()) {
            log.debug("Inbound duplicado (DB messageId): {}", canonical);
            return false;
        }

        Boolean messageIdNew = redisTemplate.opsForValue()
                .setIfAbsent(seenMessageIdKey(canonical), "1", MESSAGE_ID_TTL);
        if (!Boolean.TRUE.equals(messageIdNew)) {
            log.info("Inbound duplicado (Redis messageId): {}", canonical);
            return false;
        }

        long ts = timestamp != null ? timestamp : System.currentTimeMillis();
        String fingerprint = inboundFingerprint(content, ts);
        String fpKey = "wa_inbound_fp:" + conversationId + ":" + fingerprint;
        Boolean fpNew = redisTemplate.opsForValue().setIfAbsent(fpKey, canonical, INBOUND_FP_TTL);
        if (!Boolean.TRUE.equals(fpNew)) {
            log.info("Inbound duplicado (fingerprint) conv={} fp={}", conversationId, fingerprint);
            return false;
        }

        String normalized = normalizeContent(content);
        if (normalized != null && messageRepository.existsRecentInboundText(
                conversationId, normalized, ts - RECENT_DB_WINDOW_MS)) {
            log.info("Inbound duplicado (DB conteúdo recente) conv={}", conversationId);
            return false;
        }

        return true;
    }

    public long nextDebounceGeneration(UUID conversationId) {
        String key = "ai_debounce_gen:" + conversationId;
        Long value = redisTemplate.opsForValue().increment(key);
        redisTemplate.expire(key, DEBOUNCE_GEN_TTL);
        return value != null ? value : 1L;
    }

    public boolean isDebounceGenerationCurrent(UUID conversationId, long generation) {
        String raw = redisTemplate.opsForValue().get("ai_debounce_gen:" + conversationId);
        if (raw == null) {
            return true;
        }
        try {
            return Long.parseLong(raw) == generation;
        } catch (NumberFormatException e) {
            return true;
        }
    }

    public boolean tryAcquireProcessingLock(UUID conversationId) {
        String key = "ai_processing_lock:" + conversationId;
        Boolean acquired = redisTemplate.opsForValue().setIfAbsent(key, String.valueOf(System.currentTimeMillis()),
                PROCESSING_LOCK_TTL);
        if (!Boolean.TRUE.equals(acquired)) {
            log.warn("Execução IA já em andamento para conversa {}", conversationId);
        }
        return Boolean.TRUE.equals(acquired);
    }

    public void releaseProcessingLock(UUID conversationId) {
        redisTemplate.delete("ai_processing_lock:" + conversationId);
    }

    /**
     * @return true se o texto pode ser enviado; false se for duplicata recente.
     */
    public boolean tryRegisterOutboundText(UUID conversationId, String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        String normalized = normalizeContent(text);
        if (normalized == null) {
            return false;
        }
        try {
            String key = "ai_outbound_text_same_gen:" + conversationId + ":" + sha256(normalized);
            Boolean isNew = redisTemplate.opsForValue().setIfAbsent(key, "1", Duration.ofSeconds(5));
            if (!Boolean.TRUE.equals(isNew)) {
                log.info("Outbound texto bloqueado (mesma geração <5s) conv={}", conversationId);
                return false;
            }
        } catch (Exception e) {
            log.debug("Trava same-gen (texto) falhou (fail-open) conv={}: {}", conversationId, e.getMessage());
        }
        return true;
    }

    /**
     * Trava de mesma geração: bloqueia apenas envios do MESMO doc dentro de
     * uma janela curta (5s) — só pega disparos acidentais quando a mesma
     * resposta da IA tenta enviar duas vezes. Resends solicitados pelo lead
     * minutos depois NÃO são bloqueados (princípio: nunca descartar pedido
     * explícito do lead).
     */
    public boolean tryRegisterOutboundDocument(UUID conversationId, UUID documentId, String mediaUrl) {
        if (documentId == null) {
            return false;
        }
        try {
            String key = "ai_outbound_doc_same_gen:" + conversationId + ":" + documentId;
            Boolean isNew = redisTemplate.opsForValue().setIfAbsent(key, "1", Duration.ofSeconds(5));
            if (!Boolean.TRUE.equals(isNew)) {
                log.info("Outbound documento bloqueado (mesma geração <5s) conv={} doc={}",
                        conversationId, documentId);
                return false;
            }
        } catch (Exception e) {
            log.debug("Trava same-gen falhou (fail-open) conv={}: {}", conversationId, e.getMessage());
        }
        return true;
    }

    private void linkMessageIdAlias(String canonical, String alias) {
        if (canonical == null || alias == null || canonical.equals(alias)) {
            return;
        }
        redisTemplate.opsForValue().set("wa_msg_alias:" + alias, canonical, MESSAGE_ID_TTL);
    }

    private String resolveCanonicalMessageId(String messageId) {
        String current = messageId;
        for (int i = 0; i < 3; i++) {
            String alias = redisTemplate.opsForValue().get("wa_msg_alias:" + current);
            if (alias == null || alias.isBlank() || alias.equals(current)) {
                break;
            }
            current = alias;
        }
        return current;
    }

    private String seenMessageIdKey(String canonicalMessageId) {
        return "wa_seen_msgid:" + canonicalMessageId;
    }

    static String inboundFingerprint(String content, long timestamp) {
        String normalized = normalizeContent(content);
        long bucket = Math.max(0L, timestamp / INBOUND_FP_BUCKET_MS);
        return sha256((normalized != null ? normalized : "") + "|" + bucket);
    }

    static String normalizeContent(String content) {
        if (content == null) {
            return null;
        }
        String normalized = content.trim().replaceAll("\\s+", " ").toLowerCase();
        return normalized.isEmpty() ? null : normalized;
    }

    static String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            return Integer.toHexString(input.hashCode());
        }
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
