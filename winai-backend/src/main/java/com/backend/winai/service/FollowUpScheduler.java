package com.backend.winai.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Scheduler responsável por disparar processamento de follow-ups.
 * Intervalo configurável para evitar sobrecarga (default: a cada 5 min).
 * 
 * Só é ativado quando:
 * - followup.worker.enabled=true (container follow-up worker)
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
@ConditionalOnProperty(name = "followup.worker.enabled", havingValue = "true", matchIfMissing = false)
public class FollowUpScheduler {

    private final FollowUpService followUpService;

    /**
     * Executa no intervalo configurado (default: a cada 15 seg).
     * O processamento real é feito de forma assíncrona no FollowUpService.
     */
    @Scheduled(cron = "${followup.worker.cron:*/15 * * * * *}")
    public void triggerFollowUps() {
        log.info("[FOLLOW-UP WORKER] Iniciando verificação de follow-ups pendentes...");

        try {
            // Dispara processamento assíncrono (usa thread pool dedicado)
            followUpService.processPendingFollowUpsAsync();
            log.info("[FOLLOW-UP WORKER] Processamento de follow-ups disparado com sucesso");
        } catch (Exception e) {
            log.error("[FOLLOW-UP WORKER] Erro ao disparar processamento de follow-ups: {}", e.getMessage(), e);
        }
    }
}
