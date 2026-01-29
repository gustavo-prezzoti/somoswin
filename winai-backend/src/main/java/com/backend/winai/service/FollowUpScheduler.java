package com.backend.winai.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Scheduler responsável por disparar processamento de follow-ups.
 * Executa a cada minuto e delega processamento para threads dedicadas.
 * 
 * Só é ativado quando:
 * - followup.worker.enabled=true (container follow-up worker)
 * - OU propriedade não definida (backwards compatibility no backend principal)
 */
@Service
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "followup.worker.enabled", havingValue = "true", matchIfMissing = true)
public class FollowUpScheduler {

    private final FollowUpService followUpService;

    /**
     * Executa a cada minuto.
     * O processamento real é feito de forma assíncrona no FollowUpService.
     */
    @Scheduled(cron = "0 * * * * *")
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
