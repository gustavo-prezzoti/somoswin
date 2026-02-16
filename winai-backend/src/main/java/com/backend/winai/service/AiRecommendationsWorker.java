package com.backend.winai.service;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.MetaConnection;
import com.backend.winai.repository.MetaConnectionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Worker que gera recomendações de IA em background e persiste no cache.
 * Roda a cada 5 minutos para empresas com Meta Ads conectado.
 * Executa também ao iniciar o container.
 * Só ativo quando ai.recommendations.worker.enabled=true (container no docker-compose).
 */
@Service
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "ai.recommendations.worker.enabled", havingValue = "true", matchIfMissing = false)
public class AiRecommendationsWorker {

    private final MetaConnectionRepository metaConnectionRepository;
    private final MarketingAiRecommendationsService aiRecommendationsService;

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        log.info("[AI RECOMMENDATIONS WORKER] Iniciando - executando primeira atualização");
        refreshRecommendations();
    }

    @Scheduled(fixedRateString = "${ai.recommendations.worker.interval-ms:300000}") // 5 min default
    public void refreshRecommendations() {
        List<MetaConnection> connections = metaConnectionRepository.findByIsConnectedTrueAndAdAccountIdIsNotNull();
        if (connections.isEmpty()) {
            log.debug("[AI RECOMMENDATIONS WORKER] Nenhuma empresa com Meta Ads conectado");
            return;
        }
        log.info("[AI RECOMMENDATIONS WORKER] Atualizando recomendações para {} empresa(s)", connections.size());
        for (MetaConnection conn : connections) {
            Company company = conn.getCompany();
            if (company != null) {
                try {
                    aiRecommendationsService.generateAndStoreForCompany(company);
                } catch (Exception e) {
                    log.error("[AI RECOMMENDATIONS WORKER] Erro para empresa {}: {}", company.getId(), e.getMessage());
                }
            }
        }
    }
}
