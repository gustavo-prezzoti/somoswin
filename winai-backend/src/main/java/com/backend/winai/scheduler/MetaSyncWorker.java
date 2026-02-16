package com.backend.winai.scheduler;

import com.backend.winai.service.MetaSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Worker que sincroniza campanhas e insights da Meta para o banco de dados.
 * Roda a cada hora (configurável via meta.sync.cron).
 * Executa sync imediato na subida da aplicação.
 * Ativo apenas quando meta.sync.enabled=true.
 */
@Component
@Slf4j
@RequiredArgsConstructor
@ConditionalOnProperty(name = "meta.sync.enabled", havingValue = "true")
public class MetaSyncWorker {

    private final MetaSyncService metaSyncService;

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        log.info("[MetaSyncWorker] Aplicação pronta - executando sync inicial");
        runSync();
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
