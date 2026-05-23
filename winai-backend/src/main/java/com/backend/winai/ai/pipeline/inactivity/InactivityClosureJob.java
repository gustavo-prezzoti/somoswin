package com.backend.winai.ai.pipeline.inactivity;

import com.backend.winai.ai.pipeline.config.AiPipelineProperties;
import com.backend.winai.entity.WhatsAppConversation;
import com.backend.winai.repository.WhatsAppConversationRepository;
import com.backend.winai.service.AIAgentService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Profile("!followup-worker & !broadcast-worker & !meta-sync & !ai-recommendations-worker & !google-oauth-worker")
@ConditionalOnProperty(name = "ai.pipeline.enabled", havingValue = "true", matchIfMissing = true)
public class InactivityClosureJob {

    private final AiPipelineProperties props;
    private final WhatsAppConversationRepository conversationRepository;
    private final AIAgentService aiAgentService;

    @Scheduled(cron = "${ai.pipeline.inactivity-cron:0 0 * * * *}")
    @Transactional
    public void runHourly() {
        long timeoutMin = Math.max(15L, props.getInactivityTimeoutMin());
        long cutoffMs = System.currentTimeMillis() - (timeoutMin * 60_000L);

        List<WhatsAppConversation> idle;
        try {
            idle = conversationRepository.findIaConversationsIdleSince(cutoffMs);
        } catch (Exception e) {
            log.warn("InactivityClosureJob: erro listando conversas inativas: {}", e.getMessage());
            return;
        }

        if (idle.isEmpty()) {
            log.debug("InactivityClosureJob: nenhuma conversa IA inativa há mais de {} min", timeoutMin);
            return;
        }

        log.info("InactivityClosureJob: {} conversas IA inativas há mais de {} min", idle.size(), timeoutMin);
        int closed = 0;
        for (WhatsAppConversation conv : idle) {
            try {
                aiAgentService.updateLeadMemory(conv, "[SUMMARY]");
                conv.setSupportMode("HUMAN");
                conversationRepository.save(conv);
                closed++;
            } catch (Exception e) {
                log.warn("InactivityClosureJob: falha ao encerrar conv {}: {}", conv.getId(), e.getMessage());
            }
        }
        log.info("InactivityClosureJob: {} conversas encerradas por inatividade", closed);
    }
}
