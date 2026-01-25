package com.backend.winai.queue;

import com.backend.winai.dto.queue.AiQueueMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiResponseProducer {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final String QUEUE_NAME = "ai_response_queue";

    public boolean sendMessage(AiQueueMessage message) {
        try {
            String convId = message.getConversationId();
            String bufferKey = "ai_buffer:" + convId;
            String metaKey = "ai_metadata:" + convId;
            String silenceKey = "ai_silence_timer:" + convId;

            // 1. Acumula o texto da mensagem na lista do Redis
            redisTemplate.opsForList().rightPush(bufferKey, message.getUserMessage());

            // 2. Salva metadados (sobrescreve com os mais recentes mas preserva imagem)
            if (message.getImageUrl() == null) {
                Object existingObj = redisTemplate.opsForValue().get(metaKey);
                if (existingObj instanceof AiQueueMessage) {
                    AiQueueMessage existing = (AiQueueMessage) existingObj;
                    if (existing != null && existing.getImageUrl() != null) {
                        message.setImageUrl(existing.getImageUrl());
                    }
                }
            }
            redisTemplate.opsForValue().set(metaKey, message);

            // 3. Atualiza o timer de silêncio para AGORA
            redisTemplate.opsForValue().set(silenceKey, System.currentTimeMillis());

            // 4. Adiciona a conversa na lista de "Vigilância" (Set para evitar duplicados)
            redisTemplate.opsForSet().add("ai_active_debounces", convId);

            log.info("Mensagem acumulada para buffer da IA: {}. Lead: {}", convId, message.getLeadName());
            return true;
        } catch (Exception e) {
            log.error("Erro ao acumular mensagem para IA: {}", e.getMessage());
            return false;
        }
    }
}
