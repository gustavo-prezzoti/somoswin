package com.backend.winai.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class ChatMemoryService {

    private final StringRedisTemplate redisTemplate;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    private static final String HISTORY_KEY_PREFIX = "chat:history:";
    private static final String PROFILE_COMPLETE_KEY_PREFIX = "chat:profile_complete:";
    private static final String USER_NAME_KEY_PREFIX = "user:name:";
    private static final String LOCK_KEY_PREFIX = "chat:lock:";

    public void saveMessage(String chatId, String role, String content) {
        String key = HISTORY_KEY_PREFIX + chatId;
        String message = role + "|" + content;
        redisTemplate.opsForList().rightPush(key, message);
        redisTemplate.expire(key, Duration.ofDays(7));
    }

    public void saveMemory(String memoryKey, java.util.List<java.util.Map<String, Object>> messages) {
        try {
            String key = HISTORY_KEY_PREFIX + memoryKey;
            String json = objectMapper.writeValueAsString(messages);
            redisTemplate.opsForValue().set(key, json, Duration.ofDays(7));
        } catch (Exception e) {
            throw new RuntimeException("Erro ao salvar memória no Redis", e);
        }
    }

    public java.util.List<java.util.Map<String, Object>> getMemory(String memoryKey) {
        try {
            String key = HISTORY_KEY_PREFIX + memoryKey;
            String json = redisTemplate.opsForValue().get(key);
            if (json == null)
                return new java.util.ArrayList<>();
            return objectMapper.readValue(json,
                    new com.fasterxml.jackson.core.type.TypeReference<java.util.List<java.util.Map<String, Object>>>() {
                    });
        } catch (Exception e) {
            return new java.util.ArrayList<>();
        }
    }

    public void saveUserName(String telefone, String nome) {
        if (telefone == null || telefone.isEmpty())
            return;
        redisTemplate.opsForValue().set(USER_NAME_KEY_PREFIX + telefone, nome, Duration.ofDays(30));
    }

    public String getUserName(String telefone) {
        if (telefone == null || telefone.isEmpty())
            return null;
        return redisTemplate.opsForValue().get(USER_NAME_KEY_PREFIX + telefone);
    }

    public boolean isLocked(String conversationId, String lockKey) {
        String key = LOCK_KEY_PREFIX + conversationId + ":" + lockKey;
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }

    public void setLock(String conversationId, String lockKey, int seconds) {
        String key = LOCK_KEY_PREFIX + conversationId + ":" + lockKey;
        redisTemplate.opsForValue().set(key, "locked", Duration.ofSeconds(seconds));
    }

    public void clearHistory(String chatId) {
        redisTemplate.delete(HISTORY_KEY_PREFIX + chatId);
    }

    public void markProfileComplete(String companyId) {
        redisTemplate.opsForValue().set(PROFILE_COMPLETE_KEY_PREFIX + companyId, "true");
    }

    public boolean isProfileComplete(String companyId) {
        String val = redisTemplate.opsForValue().get(PROFILE_COMPLETE_KEY_PREFIX + companyId);
        return "true".equals(val);
    }
}
