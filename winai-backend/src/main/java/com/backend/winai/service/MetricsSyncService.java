package com.backend.winai.service;

import com.backend.winai.entity.*;
import com.backend.winai.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
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
    private final MetaInsightRepository metaInsightRepository;
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

            // 2. Dados da Meta Insight (Spend, Impressions, Clicks, Conversions)
            List<MetaInsight> insights = metaInsightRepository.findByCompanyIdAndDateBetween(company.getId(), date,
                    date);
            double totalSpend = insights.stream().filter(i -> i.getSpend() != null).mapToDouble(MetaInsight::getSpend)
                    .sum();
            long totalImpressions = insights.stream().filter(i -> i.getImpressions() != null)
                    .mapToLong(MetaInsight::getImpressions).sum();
            long totalClicks = insights.stream().filter(i -> i.getClicks() != null).mapToLong(MetaInsight::getClicks)
                    .sum();
            long metaConversions = insights.stream().filter(i -> i.getConversions() != null)
                    .mapToLong(MetaInsight::getConversions).sum();

            // 3. Leads capturados (MAX entre Leads do sistema e Conversões da Meta)
            long systemLeads = leadRepository.countByCompanyAndCreatedAtBetween(company, startOfDay, endOfDay);
            long leadsCaptured = Math.max(systemLeads, metaConversions);

            // Cálculos
            BigDecimal avgCpl = BigDecimal.ZERO;
            if (leadsCaptured > 0) {
                avgCpl = BigDecimal.valueOf(totalSpend / leadsCaptured).setScale(2, RoundingMode.HALF_UP);
            }

            BigDecimal conversionRate = BigDecimal.ZERO;
            if (totalClicks > 0) {
                conversionRate = BigDecimal.valueOf((double) leadsCaptured / totalClicks * 100).setScale(2,
                        RoundingMode.HALF_UP);
            }

            // ROI Estimado: (Leads * 100.0) / Investimento
            BigDecimal roi = BigDecimal.ZERO;
            if (totalSpend > 0) {
                roi = BigDecimal.valueOf((leadsCaptured * 100.0) / totalSpend).setScale(2, RoundingMode.HALF_UP);
            }

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
            metrics.setInvestment(BigDecimal.valueOf(totalSpend).setScale(2, RoundingMode.HALF_UP));
            metrics.setClicks((int) totalClicks);
            metrics.setImpressions(totalImpressions);

            // Métricas para o gráfico
            metrics.setLeadsCurrentPeriod((int) leadsCaptured);
            // leadsPreviousPeriod é preenchido pelo DashboardService na hora de montar a
            // resposta,
            // ou podemos preencher aqui buscando o dia anterior.

            // Score de Performance (Cálculo fictício mas baseado em algo real)
            int score = calculatePerformanceScore((int) leadsCaptured, totalSpend, (int) meetingsCount);
            metrics.setPerformanceScore(score);

            dashboardMetricsRepository.save(metrics);

        } catch (Exception e) {
            log.error("Erro ao atualizar métricas para a data {} e empresa {}", date, company.getId(), e);
        }
    }

    private int calculatePerformanceScore(int leads, double spend, int meetings) {
        if (leads == 0)
            return 0;
        int score = 50; // Base
        if (leads > 10)
            score += 10;
        if (meetings > 2)
            score += 20;
        if (spend > 0 && (spend / leads) < 15.0)
            score += 20; // CPL bom
        return Math.min(100, score);
    }
}
