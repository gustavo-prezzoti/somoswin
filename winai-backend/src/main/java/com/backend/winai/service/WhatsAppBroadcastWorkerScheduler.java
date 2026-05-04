package com.backend.winai.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "winai.broadcast.worker.enabled", havingValue = "true", matchIfMissing = false)
public class WhatsAppBroadcastWorkerScheduler {

    private final WhatsAppBroadcastService broadcastService;

    @Scheduled(fixedDelayString = "${winai.broadcast.worker-interval-ms:3000}")
    public void tick() {
        try {
            broadcastService.processDueDispatchesBatch();
        } catch (Exception e) {
            log.error("[Broadcast worker] Erro no lote: {}", e.getMessage(), e);
        }
    }
}
