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
            log.info("Enqueuing AI request for conversation: {}, Lead: {}",
                    message.getConversationId(), message.getLeadName());

            // Registrar timestamp desta mensagem como a última para esta conversa (Debounce
            // control)
            String lastMsgKey = "ai_last_timestamp:" + message.getConversationId();
            redisTemplate.opsForValue().set(lastMsgKey, message.getTimestamp());

            redisTemplate.opsForList().leftPush(QUEUE_NAME, message);
            return true;
        } catch (Exception e) {
            log.error("Failed to enqueue AI request: {}", e.getMessage());
            return false;
        }
    }
}
