package com.backend.winai.queue;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * COMPAT/CLEANUP:
 * O consumer original (debouncer baseado em Set+ZSET no Redis) foi substituído
 * pelo {@link com.backend.winai.ai.pipeline.AiPipelineService} — aggregator
 * agora vive no processo, com timer reset + hard cap descritos nas REGRAS DE
 * NEGÓCIO. Mantemos esta classe apenas para drenar/expirar chaves legadas em
 * ambientes que ainda tinham buffers ativos no Redis no momento do deploy.
 *
 * Pode ser removida após uma janela de migração.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Profile("!followup-worker & !broadcast-worker")
@ConditionalOnProperty(name = "ai.pipeline.legacy-cleanup", havingValue = "true", matchIfMissing = false)
public class AiResponseConsumer {

    private final RedisTemplate<String, Object> redisTemplate;

    @Scheduled(fixedDelayString = "${ai.queue.legacy-cleanup-interval-ms:60000}")
    public void cleanupLegacyKeys() {
        try {
            java.util.Set<Object> active = redisTemplate.opsForSet().members("ai_active_debounces");
            if (active == null || active.isEmpty()) return;
            for (Object o : active) {
                String convId = String.valueOf(o);
                redisTemplate.delete("ai_buffer:" + convId);
                redisTemplate.delete("ai_metadata:" + convId);
                redisTemplate.delete("ai_silence_timer:" + convId);
                redisTemplate.opsForSet().remove("ai_active_debounces", convId);
                log.info("Legacy cleanup: removidas chaves ai_*:{}", convId);
            }
        } catch (RedisConnectionFailureException e) {
            log.debug("Legacy cleanup: Redis off ({}).", e.getMessage());
        } catch (Exception e) {
            log.warn("Legacy cleanup falhou: {}", e.getMessage());
        }
    }
}
