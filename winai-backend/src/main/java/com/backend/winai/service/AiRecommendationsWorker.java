package com.backend.winai.service;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.MetaConnection;
import com.backend.winai.repository.MetaConnectionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Lazy;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Slf4j
@ConditionalOnProperty(name = "ai.recommendations.worker.enabled", havingValue = "true", matchIfMissing = false)
public class AiRecommendationsWorker {

    private final MetaConnectionRepository metaConnectionRepository;
    private final MarketingAiRecommendationsService aiRecommendationsService;
    private final AiRecommendationsWorker self;

    public AiRecommendationsWorker(MetaConnectionRepository metaConnectionRepository,
                                   MarketingAiRecommendationsService aiRecommendationsService,
                                   @Lazy AiRecommendationsWorker self) {
        this.metaConnectionRepository = metaConnectionRepository;
        this.aiRecommendationsService = aiRecommendationsService;
        this.self = self;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        log.info("[AI RECOMMENDATIONS WORKER] Iniciando - executando primeira atualização");
        refreshRecommendations();
    }

    @Scheduled(fixedRateString = "${ai.recommendations.worker.interval-ms:300000}")
    public void refreshRecommendations() {
        List<UUID> companyIds;
        try {
            companyIds = self.loadConnectedCompanyIds();
        } catch (Exception e) {
            log.error("[AI RECOMMENDATIONS WORKER] Erro listando conexões: {}", e.getMessage());
            return;
        }
        if (companyIds.isEmpty()) {
            log.debug("[AI RECOMMENDATIONS WORKER] Nenhuma empresa com Meta Ads conectado");
            return;
        }
        log.info("[AI RECOMMENDATIONS WORKER] Atualizando recomendações para {} empresa(s)", companyIds.size());
        for (UUID companyId : companyIds) {
            try {
                self.refreshForCompany(companyId);
            } catch (Exception e) {
                log.error("[AI RECOMMENDATIONS WORKER] Erro para empresa {}: {}", companyId, e.getMessage());
            }
        }
    }

    @Transactional(readOnly = true)
    public List<UUID> loadConnectedCompanyIds() {
        return metaConnectionRepository.findByIsConnectedTrueAndAdAccountIdIsNotNull().stream()
                .map(MetaConnection::getCompany)
                .filter(c -> c != null)
                .map(Company::getId)
                .toList();
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void refreshForCompany(UUID companyId) {
        Company company = self.loadCompany(companyId);
        if (company == null) return;
        aiRecommendationsService.generateAndStoreForCompany(company);
    }

    @Transactional(readOnly = true)
    public Company loadCompany(UUID companyId) {
        return metaConnectionRepository.findByIsConnectedTrueAndAdAccountIdIsNotNull().stream()
                .map(MetaConnection::getCompany)
                .filter(c -> c != null && companyId.equals(c.getId()))
                .findFirst()
                .orElse(null);
    }
}
