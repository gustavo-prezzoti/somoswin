package com.backend.winai.service;

import com.backend.winai.entity.*;
import com.backend.winai.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MetricsSyncService {

    private final DashboardMetricsRepository dashboardMetricsRepository;
    private final LeadRepository leadRepository;
    // MetaInsightRepository removed
    private final MeetingRepository meetingRepository;

    /**
     * Sincroniza as métricas do dashboard para uma empresa nos últimos N dias
     */
    @Transactional
    public void syncDashboardMetrics(Company company, int days) {
        log.info("Sincronizando métricas do dashboard para a empresa {} nos últimos {} dias", company.getId(), days);

        LocalDate today = LocalDate.now();
        for (int i = 0; i < days; i++) {
            LocalDate date = today.minusDays(i);
            updateMetricsForDate(company, date);
        }
    }

    private void updateMetricsForDate(Company company, LocalDate date) {
        try {
            LocalDateTime startOfDay = date.atStartOfDay();
            LocalDateTime endOfDay = date.atTime(LocalTime.MAX);

            // 1. Conversões (Meetings criadas no dia)
            List<Meeting> meetingsCreatedToday = meetingRepository
                    .findByCompanyAndMeetingDateBetweenOrderByMeetingDateAscMeetingTimeAsc(
                            company, date, date);
            long meetingsCount = meetingsCreatedToday.size();

            // 2. Dados da Meta Insight REMOVIDOS (Usando Live Fetching no DashboardService)
            // Variáveis de custo e métricas Meta mantidas como 0.0 para compatibilidade de
            // assinatura,
            // mas não são mais lidas do banco syncado.

            // 3. Leads capturados (Apenas Leads do sistema)
            long systemLeads = leadRepository.countByCompanyAndCreatedAtBetween(company, startOfDay, endOfDay);
            long leadsCaptured = systemLeads;

            // Cálculos (CPL/ROI serão calculados no DashboardService com dados Live)
            // Aqui salvamos 0 ou valores parciais
            BigDecimal avgCpl = BigDecimal.ZERO;
            BigDecimal conversionRate = BigDecimal.ZERO;
            BigDecimal roi = BigDecimal.ZERO;
            BigDecimal roas = BigDecimal.ZERO;

            // Busca ou cria registro de métrica
            DashboardMetrics metrics = dashboardMetricsRepository.findByCompanyAndDate(company, date)
                    .orElse(DashboardMetrics.builder()
                            .company(company)
                            .date(date)
                            .build());

            metrics.setLeadsCaptured((int) leadsCaptured);
            metrics.setCplAverage(avgCpl);
            metrics.setConversionRate(conversionRate);
            metrics.setRoi(roi);
            metrics.setRoas(roas);
            metrics.setInvestment(BigDecimal.ZERO);
            metrics.setClicks(0);
            metrics.setImpressions(0L);

            // Métricas para o gráfico
            metrics.setLeadsCurrentPeriod((int) leadsCaptured);

            // Score de Performance (Baseado apenas em Leads e Meetings por enquanto)
            int score = calculatePerformanceScore((int) leadsCaptured, (int) meetingsCount);
            metrics.setPerformanceScore(score);

            dashboardMetricsRepository.save(metrics);

        } catch (Exception e) {
            log.error("Erro ao atualizar métricas para a data {} e empresa {}", date, company.getId(), e);
        }
    }

    private int calculatePerformanceScore(int leads, int meetings) {
        if (leads == 0 && meetings == 0)
            return 0;
        int score = 40; // Base score for active operation

        // Leads volume (0-40 points)
        if (leads > 20)
            score += 40;
        else if (leads > 10)
            score += 20;
        else if (leads > 0)
            score += 10;

        // Meetings / Conversions (0-20 points)
        if (meetings > 5)
            score += 20;
        else if (meetings > 2)
            score += 10;
        else if (meetings > 0)
            score += 5;

        // Cap at 100
        return Math.min(100, score);
    }
}
