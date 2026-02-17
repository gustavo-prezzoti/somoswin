package com.backend.winai.scheduler;

import com.backend.winai.service.MetaSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Worker que sincroniza campanhas e insights da Meta para o banco de dados.
 * Roda a cada hora (configurável via meta.sync.cron).
 * Executa sync na subida da aplicação (após delay configurável para garantir DB pronto).
 * Ativo apenas quando meta.sync.enabled=true.
 */
@Component
@Slf4j
@RequiredArgsConstructor
@ConditionalOnProperty(name = "meta.sync.enabled", havingValue = "true")
public class MetaSyncWorker {

    private final MetaSyncService metaSyncService;

    @Value("${meta.sync.initial-delay-ms:15000}")
    private long initialDelayMs;

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        log.info("[MetaSyncWorker] Aplicação pronta - agendando sync inicial em {}s (após restart)", initialDelayMs / 1000);
        new Thread(() -> {
            try {
                Thread.sleep(initialDelayMs);
                log.info("[MetaSyncWorker] Executando sync inicial pós-restart");
                runSync();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.warn("[MetaSyncWorker] Sync inicial interrompido");
            }
        }, "meta-sync-startup").start();
    }

    @Scheduled(cron = "${meta.sync.cron:0 0 * * * *}")
    public void runSync() {
        log.info("[MetaSyncWorker] Iniciando sincronização Meta -> DB");
        try {
            metaSyncService.syncAll();
        } catch (Exception e) {
            log.error("[MetaSyncWorker] Erro na sincronização", e);
        }
    }
}
