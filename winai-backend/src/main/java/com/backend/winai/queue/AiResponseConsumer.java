package com.backend.winai.queue;

import com.backend.winai.dto.queue.AiQueueMessage;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.WhatsAppConversation;
import com.backend.winai.repository.CompanyRepository;
import com.backend.winai.repository.WhatsAppConversationRepository;
import com.backend.winai.service.AIAgentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiResponseConsumer {

    private final RedisTemplate<String, Object> redisTemplate;
    private final AIAgentService aiAgentService;
    private final WhatsAppConversationRepository conversationRepository;
    private final CompanyRepository companyRepository;

    private static final String QUEUE_NAME = "ai_response_queue";

    @Scheduled(fixedDelay = 1000) // Poll every second
    public void processQueue() {
        try {
            // Block and pop from right (FIFO) for 5 seconds max per poll loop
            // Note: RedisTemplate rightPop with timeout requires a blocking connection
            // For simplicity in this scheduled task, we can use non-blocking pop or
            // blocking logic suited for the worker
            Object messageObj = redisTemplate.opsForList().rightPop(QUEUE_NAME);

            if (messageObj instanceof AiQueueMessage) {
                AiQueueMessage message = (AiQueueMessage) messageObj;
                log.info("Processing AI request for conversation: {}, Lead: {}",
                        message.getConversationId(), message.getLeadName());

                processMessage(message);
            }
        } catch (org.springframework.data.redis.RedisConnectionFailureException e) {
            // Log less aggressively for connection failures
            log.warn("Redis connection failed in Consumer: {}", e.getMessage());
        } catch (Exception e) {
            log.error("Error processing AI queue", e);
        }
    }

    private void processMessage(AiQueueMessage message) {
        try {
            UUID conversationId = UUID.fromString(message.getConversationId());
            UUID companyId = UUID.fromString(message.getCompanyId());

            WhatsAppConversation conversation = conversationRepository.findById(conversationId).orElse(null);
            Company company = companyRepository.findById(companyId).orElse(null);

            if (conversation != null && company != null) {
                // Pass lead name context provided in message
                aiAgentService.processAndRespond(conversation, message.getUserMessage(), message.getLeadName());
            } else {
                log.warn("Conversation or Company not found for queued message: {}", message);
            }

        } catch (Exception e) {
            log.error("Failed to process AI message logic", e);
        }
    }
}
