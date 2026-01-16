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

    @Scheduled(fixedDelay = 500) // Verifica a cada meio segundo
    public void processQueue() {
        try {
            // Busca todas as conversas que estão aguardando silêncio
            java.util.Set<Object> activeConvIds = redisTemplate.opsForSet().members("ai_active_debounces");
            if (activeConvIds == null || activeConvIds.isEmpty()) {
                return;
            }

            long now = System.currentTimeMillis();

            for (Object objId : activeConvIds) {
                String convId = (String) objId;
                String silenceKey = "ai_silence_timer:" + convId;

                Object lastTimestampObj = redisTemplate.opsForValue().get(silenceKey);
                if (lastTimestampObj == null)
                    continue;

                long lastTimestamp = Long.parseLong(lastTimestampObj.toString());

                // Se houveram 3 segundos de silêncio (DEBOUNCE_DELAY_MS), processamos
                if (now - lastTimestamp >= DEBOUNCE_DELAY_MS) {
                    processMergedMessages(convId);
                }
            }
        } catch (org.springframework.data.redis.RedisConnectionFailureException e) {
            log.warn("Redis connection failed in Consumer: {}", e.getMessage());
        } catch (Exception e) {
            log.error("Error processing AI queue", e);
        }
    }

    private void processMergedMessages(String convId) {
        executorService.submit(() -> {
            try {
                // 1. Tira do Set de vigilância ANTES do processamento (evita duplicidade)
                redisTemplate.opsForSet().remove("ai_active_debounces", convId);

                String bufferKey = "ai_buffer:" + convId;
                String metaKey = "ai_metadata:" + convId;
                String silenceKey = "ai_silence_timer:" + convId;

                // 2. Coleta mensagens acumuladas e metadados
                java.util.List<Object> messages = redisTemplate.opsForList().range(bufferKey, 0, -1);
                Object metaObj = redisTemplate.opsForValue().get(metaKey);

                if (messages == null || messages.isEmpty() || !(metaObj instanceof AiQueueMessage)) {
                    // Limpeza de segurança se não houver o que processar
                    redisTemplate.delete(bufferKey);
                    redisTemplate.delete(metaKey);
                    redisTemplate.delete(silenceKey);
                    return;
                }

                AiQueueMessage metadata = (AiQueueMessage) metaObj;

                // 3. Junta as mensagens em um único texto contextual
                StringBuilder mergedText = new StringBuilder();
                for (Object msg : messages) {
                    String text = msg.toString();
                    if (mergedText.length() > 0)
                        mergedText.append(" ");
                    mergedText.append(text);
                    if (!text.endsWith(".") && !text.endsWith("!") && !text.endsWith("?")) {
                        mergedText.append(".");
                    }
                }

                log.info("Processando {} mensagens agrupadas para conversa: {} | Texto: {}",
                        messages.size(), convId, mergedText);

                // 4. Limpa o Redis ANTES de chamar a IA (evita rastro se falhar)
                redisTemplate.delete(bufferKey);
                redisTemplate.delete(metaKey);
                redisTemplate.delete(silenceKey);

                // 5. Busca as entidades e processa!
                UUID conversationId = UUID.fromString(metadata.getConversationId());
                UUID companyId = UUID.fromString(metadata.getCompanyId());

                WhatsAppConversation conversation = conversationRepository.findById(conversationId).orElse(null);
                Company company = companyRepository.findById(companyId).orElse(null);

                if (conversation != null && company != null) {
                    aiAgentService.processAndRespond(conversation, mergedText.toString(), metadata.getLeadName());
                } else {
                    log.warn("Conversation or Company not found for accumulated message: {}", metadata);
                }

            } catch (Exception e) {
                log.error("Erro ao processar mensagens acumuladas para: " + convId, e);
            }
        });
    }
}
