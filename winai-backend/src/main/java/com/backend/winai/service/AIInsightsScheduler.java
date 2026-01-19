package com.backend.winai.service;

import com.backend.winai.entity.Company;
import com.backend.winai.repository.CompanyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Scheduler responsável por gerar insights de IA em background
 * Roda a cada hora para todas as empresas, evitando lentidão no dashboard
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AIInsightsScheduler {

    private final CompanyRepository companyRepository;
    private final DashboardService dashboardService;

    /**
     * Executa a cada hora para gerar insights para todas as empresas
     * Roda de forma assíncrona para não bloquear outras operações
     */
    @Scheduled(cron = "0 0 * * * *") // A cada hora cheia
    public void generateInsightsForAllCompanies() {
        log.info("Iniciando geração automática de insights de IA para todas as empresas...");

        List<Company> companies = companyRepository.findAll();
        int successCount = 0;
        int errorCount = 0;

        for (Company company : companies) {
            try {
                dashboardService.refreshAIInsights(company);
                successCount++;
                log.debug("Insights gerados com sucesso para empresa: {}", company.getName());
            } catch (Exception e) {
                errorCount++;
                log.error("Erro ao gerar insights para empresa {}: {}", company.getName(), e.getMessage());
            }
        }

        log.info("Geração de insights concluída. Sucesso: {}, Erros: {}", successCount, errorCount);
    }

    /**
     * Método para gerar insights para uma empresa específica de forma assíncrona
     * Pode ser chamado manualmente se necessário
     */
    @Async
    public void generateInsightsAsync(Company company) {
        try {
            log.info("Gerando insights assíncrono para empresa: {}", company.getName());
            dashboardService.refreshAIInsights(company);
            log.info("Insights gerados com sucesso para empresa: {}", company.getName());
        } catch (Exception e) {
            log.error("Erro ao gerar insights para empresa {}: {}", company.getName(), e.getMessage());
        }
    }
}
