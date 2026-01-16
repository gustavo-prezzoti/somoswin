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
    private final java.util.concurrent.ExecutorService executorService = java.util.concurrent.Executors
            .newCachedThreadPool();

    private static final String QUEUE_NAME = "ai_response_queue";
    private static final long DEBOUNCE_DELAY_MS = 3000; // Aguardar 3 segundos de silêncio

    @Scheduled(fixedDelay = 500) // Poll mais frequente
    public void processQueue() {
        try {
            Object messageObj = redisTemplate.opsForList().rightPop(QUEUE_NAME);

            if (messageObj instanceof AiQueueMessage) {
                AiQueueMessage message = (AiQueueMessage) messageObj;

                // Processar em thread separada para não travar a fila para outros usuários
                executorService.submit(() -> processMessage(message));
            }
        } catch (org.springframework.data.redis.RedisConnectionFailureException e) {
            log.warn("Redis connection failed in Consumer: {}", e.getMessage());
        } catch (Exception e) {
            log.error("Error processing AI queue", e);
        }
    }

    private void processMessage(AiQueueMessage message) {
        String lastMsgKey = "ai_last_timestamp:" + message.getConversationId();
        try {
            // 1. Verificação inicial: Se já existe uma mensagem mais nova no Redis,
            // descarta esta
            Object lastTimestampObj = redisTemplate.opsForValue().get(lastMsgKey);
            if (lastTimestampObj instanceof Long) {
                Long lastTimestamp = (Long) lastTimestampObj;
                if (lastTimestamp > message.getTimestamp()) {
                    log.info("Descartando mensagem antiga da conversa {}. (Timestamp: {}, Mais nova: {})",
                            message.getConversationId(), message.getTimestamp(), lastTimestamp);
                    return;
                }
            }

            // 2. Debounce Delay: Aguarda um pouco para ver se o usuário manda mais
            // mensagens
            log.info("Aguardando {}ms de silêncio para conversa {}", DEBOUNCE_DELAY_MS, message.getConversationId());
            Thread.sleep(DEBOUNCE_DELAY_MS);

            // 3. Verificação final: Após o delay, esta mensagem ainda é a última?
            lastTimestampObj = redisTemplate.opsForValue().get(lastMsgKey);
            if (lastTimestampObj instanceof Long) {
                Long lastTimestamp = (Long) lastTimestampObj;
                if (!lastTimestamp.equals(message.getTimestamp())) {
                    log.info(
                            "Usuário mandou nova mensagem durante o delay. Descartando mensagem anterior da conversa {}.",
                            message.getConversationId());
                    return;
                }
            }

            // 4. Se chegou aqui, é a última mensagem após o período de silêncio. Processa!
            UUID conversationId = UUID.fromString(message.getConversationId());
            UUID companyId = UUID.fromString(message.getCompanyId());

            WhatsAppConversation conversation = conversationRepository.findById(conversationId).orElse(null);
            Company company = companyRepository.findById(companyId).orElse(null);

            if (conversation != null && company != null) {
                log.info("Iniciando resposta da IA para conversa {} (Última mensagem confirmada)", conversationId);
                aiAgentService.processAndRespond(conversation, message.getUserMessage(), message.getLeadName());
            } else {
                log.warn("Conversation or Company not found for queued message: {}", message);
            }

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (Exception e) {
            log.error("Failed to process AI message logic", e);
        }
    }
}
