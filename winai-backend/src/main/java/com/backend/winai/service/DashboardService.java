package com.backend.winai.service;

import com.backend.winai.dto.response.DashboardResponse;
import com.backend.winai.dto.response.LeadResponse;
import com.backend.winai.entity.*;
import com.backend.winai.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

        private final DashboardMetricsRepository metricsRepository;
        private final GoalRepository goalRepository;
        private final AIInsightRepository insightRepository;
        private final MarketingService marketingService;
        private final MetricsSyncService metricsSyncService; // Re-added
        private final OpenAiService openAiService;
        private final LeadRepository leadRepository;

        private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM");

        @Transactional
        public void syncMetrics(Company company) {
                // metricsSyncService no longer syncs Meta data effectively, but might sync
                // internal leads
                metricsSyncService.syncDashboardMetrics(company, 7);
        }

        /**
         * Obtém os dados completos do dashboard para um usuário
         */
        @Transactional
        public DashboardResponse getDashboardData(User user, int days) {
                if (user == null || user.getCompany() == null) {
                        throw new RuntimeException("Usuário não possui empresa associada");
                }

                Company company = user.getCompany();
                LocalDate endDate = LocalDate.now();
                LocalDate startDate = endDate.minusDays(days - 1);

                // Fetch Local Metrics (Leads, Meetings - sourced from internal system)
                List<DashboardMetrics> localMetrics = company != null
                                ? metricsRepository.findByCompanyAndDateBetweenOrderByDateAsc(company, startDate,
                                                endDate)
                                : List.of();

                // Fetch Live Meta Metrics (Spend, Impressions, Clicks)
                List<java.util.Map<String, Object>> metaMetrics = marketingService.getRealTimeInsights(company, days);

                // Merge Data
                MetricsSummaryData currentSummary = calculateMergedSummary(localMetrics, metaMetrics, startDate, days);

                // For comparison (previous period), we would need to fetch historical data too.
                // For now, let's approximate or just fetch another batch if needed, but
                // typically 'previous' period in Live Fetching might require another API call
                // or we just compare with local history if available.
                // To keep it simple and fast, we will set previous summary to 0 or estimates
                // for now
                // OR we can fetch 2x days in getRealTimeInsights and split inside
                // calculateMergedSummary.
                // Let's assume getRealTimeInsights(days) only returns 'days' amount.
                // We will skip strict previous period comparison for Meta data to avoid double
                // API calls for now,
                // or we accept that "previous" meta data is 0 until we implement a smarter
                // fetch.
                MetricsSummaryData previousSummary = new MetricsSummaryData(0, 0, 0, 0, 0, 0, 0, 0L); // Placeholder

                // Busca goals e insights
                List<Goal> goals = company != null
                                ? goalRepository.findByCompanyAndYearCycleAndStatusOrderByCreatedAtDesc(company,
                                                LocalDate.now().getYear(), GoalStatus.ACTIVE)
                                                .stream()
                                                .filter(g -> Boolean.TRUE.equals(g.getIsHighlighted()))
                                                .limit(3)
                                                .collect(Collectors.toList())
                                : List.of();

                List<AIInsight> insights = company != null
                                ? insightRepository
                                                .findTop5ByCompanyAndIsDismissedFalseOrderByPriorityDescCreatedAtDesc(
                                                                company)
                                : List.of();

                double avgScore = localMetrics.stream()
                                .mapToDouble(m -> m.getPerformanceScore() != null ? m.getPerformanceScore() : 0)
                                .average().orElse(0.0);
                int performanceScore = (int) avgScore;

                // Monta response
                DashboardResponse response = DashboardResponse.builder()
                                .user(buildUserSummary(user))
                                .metrics(buildMetricsSummary(currentSummary, previousSummary))
                                .chartData(buildChartData(localMetrics, metaMetrics, startDate, days))
                                .goals(buildGoalDTOs(goals, company))
                                .insights(buildInsightDTOs(insights))
                                .campaigns(buildCampaignSummaries(company))
                                .recentLeads(buildRecentLeads(company))
                                .performanceScore(performanceScore)
                                .operationStatus(determineOperationStatus(performanceScore))
                                .build();

                return response;
        }

        private List<LeadResponse> buildRecentLeads(Company company) {
                if (company == null)
                        return List.of();

                return leadRepository.findByCompanyOrderByCreatedAtDesc(company, PageRequest.of(0, 5))
                                .getContent()
                                .stream()
                                .map(l -> LeadResponse.builder()
                                                .id(l.getId())
                                                .name(l.getName())
                                                .email(l.getEmail())
                                                .phone(l.getPhone())
                                                .status(l.getStatus().name())
                                                .statusLabel(l.getStatus().name()) // Simplificado
                                                .createdAt(l.getCreatedAt())
                                                .build())
                                .collect(Collectors.toList());
        }

        private List<DashboardResponse.CampaignSummaryDTO> buildCampaignSummaries(Company company) {
                if (company == null)
                        return List.of();

                List<java.util.Map<String, Object>> campaigns = marketingService.getRealTimeCampaigns(company);

                return campaigns.stream().map(c -> {
                        double spend = (double) c.get("spend");
                        long conversions = (long) c.get("conversions");
                        long clicks = (long) c.get("clicks");

                        double cpl = conversions > 0 ? spend / conversions : 0;
                        double convRate = clicks > 0 ? (double) conversions / clicks * 100 : 0;

                        return DashboardResponse.CampaignSummaryDTO.builder()
                                        .name((String) c.get("name"))
                                        .status((String) c.get("status"))
                                        .leads((int) conversions)
                                        .spend(formatCurrency(spend))
                                        .cpl(formatCurrency(cpl))
                                        .conversion(formatPercentage(convRate))
                                        .roas(formatRoi(cpl > 0 ? (100.0 / cpl) : 0))
                                        .build();
                }).collect(Collectors.toList());
        }

        /**
         * Gera dados de demonstração para uma nova empresa
         */
        @Transactional
        public void generateDemoData(Company company) {
                LocalDate today = LocalDate.now();

                // Gera métricas dos últimos 14 dias
                for (int i = 13; i >= 0; i--) {
                        LocalDate date = today.minusDays(i);
                        DashboardMetrics metrics = DashboardMetrics.builder()
                                        .company(company)
                                        .date(date)
                                        .leadsCaptured(randomBetween(10, 30))
                                        .cplAverage(BigDecimal.valueOf(randomBetween(1000, 2000) / 100.0))
                                        .conversionRate(BigDecimal.valueOf(randomBetween(1500, 2800) / 100.0))
                                        .roi(BigDecimal.valueOf(randomBetween(300, 600) / 100.0))
                                        .leadsCurrentPeriod(randomBetween(10, 30))
                                        .leadsPreviousPeriod(randomBetween(8, 20))
                                        .performanceScore(randomBetween(70, 95))
                                        .build();
                        metricsRepository.save(metrics);
                }

                // Gera goals
                List<Goal> goals = List.of(
                                Goal.builder()
                                                .company(company)
                                                .title("Redução de 15% no CPL Médio")
                                                .description("Diminuir o custo por lead médio em 15%")
                                                .goalType(GoalType.CPL)
                                                .targetValue(100)
                                                .currentValue(0)
                                                .yearCycle(LocalDate.now().getYear())
                                                .status(GoalStatus.ACTIVE)
                                                .build(),
                                Goal.builder()
                                                .company(company)
                                                .title("Escala de 3.000 Leads Qualificados")
                                                .description("Captar 3000 leads qualificados no ciclo")
                                                .goalType(GoalType.LEADS)
                                                .targetValue(3000)
                                                .currentValue(0)
                                                .yearCycle(LocalDate.now().getYear())
                                                .status(GoalStatus.ACTIVE)
                                                .build(),
                                Goal.builder()
                                                .company(company)
                                                .title("Taxa de Show-up em Reunião > 80%")
                                                .description("Garantir que mais de 80% dos leads agendados compareçam")
                                                .goalType(GoalType.SHOWUP)
                                                .targetValue(100)
                                                .currentValue(0)
                                                .yearCycle(LocalDate.now().getYear())
                                                .status(GoalStatus.ACTIVE)
                                                .build());
                goalRepository.saveAll(goals);

                // Gera insights iniciais específicos do WIN.AI 2026
                List<AIInsight> insights = List.of(
                                AIInsight.builder()
                                                .company(company)
                                                .title("Escalar Orçamento")
                                                .description("Seu CPL está **15% abaixo da média**. Recomendamos aumentar o orçamento em **20%** nas campanhas de alta performance.")
                                                .suggestionSource("Agente de Tráfego")
                                                .insightType(InsightType.OPTIMIZATION)
                                                .priority(InsightPriority.HIGH)
                                                .actionUrl("/campanhas")
                                                .actionLabel("Acessar Campanhas")
                                                .isRead(false)
                                                .isDismissed(false)
                                                .build(),
                                AIInsight.builder()
                                                .company(company)
                                                .title("Lead Stalling")
                                                .description("O Agente SDR identificou **12 leads qualificados** aguardando resposta há mais de **2 horas**. Intervenha agora.")
                                                .suggestionSource("Agente SDR")
                                                .insightType(InsightType.NOTIFICATION)
                                                .priority(InsightPriority.HIGH)
                                                .actionUrl("/whatsapp")
                                                .actionLabel("Intervir via WhatsApp")
                                                .isRead(false)
                                                .isDismissed(false)
                                                .build(),
                                AIInsight.builder()
                                                .company(company)
                                                .title("Growth Orgânico")
                                                .description("Seus últimos **Reels de prova social** tiveram **40% mais engajamento**. Gere novos roteiros similares para manter o pico.")
                                                .suggestionSource("IA Social Media")
                                                .insightType(InsightType.SUGGESTION)
                                                .priority(InsightPriority.MEDIUM)
                                                .actionUrl("/social")
                                                .actionLabel("Criar Roteiros")
                                                .isRead(false)
                                                .isDismissed(false)
                                                .build());
                insightRepository.saveAll(insights);
        }

        // ============================================
        // Private helper methods
        // ============================================

        private DashboardResponse.UserSummary buildUserSummary(User user) {
                String companyName = null;
                String plan = "STARTER";

                if (user.getCompany() != null) {
                        // Tentar obter sem carregar se possível, ou admitir que pode falhar
                        // Para ser seguro, o ideal é que o 'user' já venha com a empresa carregada
                        // ou que carreguemos aqui.
                        try {
                                companyName = user.getCompany().getName();
                                plan = user.getCompany().getPlan().name();
                        } catch (Exception e) {
                                // Se falhar por Lazy, não quebramos o dashboard
                                companyName = "Empresa";
                        }
                }

                return DashboardResponse.UserSummary.builder()
                                .name(user.getName())
                                .email(user.getEmail())
                                .companyName(companyName)
                                .plan(plan)
                                .build();
        }

        private DashboardResponse.MetricsSummary buildMetricsSummary(MetricsSummaryData current,
                        MetricsSummaryData previous) {

                // Cálculos baseados no modelo do usuário
                DashboardResponse.MetricsSummary summary = DashboardResponse.MetricsSummary.builder()
                                .leadsCaptured(buildMetricCard(String.valueOf(current.totalLeads()),
                                                calculateTrend(current.totalLeads(), previous.totalLeads()),
                                                current.totalLeads() >= previous.totalLeads()))
                                .cplAverage(buildMetricCard(formatCurrency(current.avgCpl()),
                                                calculateTrend(current.avgCpl(), previous.avgCpl()),
                                                current.avgCpl() <= previous.avgCpl()))
                                .conversionRate(buildMetricCard(formatPercentage(current.avgConversion()),
                                                calculateTrend(current.avgConversion(), previous.avgConversion()),
                                                current.avgConversion() >= previous.avgConversion()))
                                .roi(buildMetricCard(formatRoi(current.avgRoi()),
                                                calculateTrend(current.avgRoi(), previous.avgRoi()),
                                                current.avgRoi() >= previous.avgRoi()))
                                .roas(buildMetricCard(formatRoi(current.avgRoas()),
                                                calculateTrend(current.avgRoas(), previous.avgRoas()),
                                                current.avgRoas() >= previous.avgRoas()))
                                .investment(buildMetricCard(formatCurrency(current.totalInvestment()),
                                                calculateTrend(current.totalInvestment(), previous.totalInvestment()),
                                                current.totalInvestment() >= previous.totalInvestment()))
                                .impressions(buildMetricCard(formatNumber(current.totalImpressions()),
                                                calculateTrend(current.totalImpressions(), previous.totalImpressions()),
                                                current.totalImpressions() >= previous.totalImpressions()))
                                .clicks(buildMetricCard(String.valueOf(current.totalClicks()),
                                                calculateTrend(current.totalClicks(), previous.totalClicks()),
                                                current.totalClicks() >= previous.totalClicks()))
                                .build();
                return summary;
        }

        private DashboardResponse.MetricCard buildMetricCard(String value, String trend, boolean isPositive) {
                return DashboardResponse.MetricCard.builder()
                                .value(value)
                                .trend(trend)
                                .isPositive(isPositive)
                                .build();
        }

        private List<DashboardResponse.ChartDataPoint> buildChartData(
                        List<DashboardMetrics> metrics,
                        List<java.util.Map<String, Object>> metaMetrics,
                        LocalDate startDate,
                        int days) {

                List<DashboardResponse.ChartDataPoint> chartData = new ArrayList<>();

                for (int i = 0; i < days; i++) {
                        LocalDate date = startDate.plusDays(i);
                        String dateLabel = date.format(DATE_FORMATTER);

                        // Local Metrics (Leads)
                        DashboardMetrics metric = metrics.stream()
                                        .filter(m -> m.getDate().equals(date))
                                        .findFirst()
                                        .orElse(null);

                        int leads = metric != null && metric.getLeadsCaptured() != null ? metric.getLeadsCaptured() : 0;

                        double spend = 0;
                        String dateStr = date.toString();
                        for (java.util.Map<String, Object> m : metaMetrics) {
                                if (dateStr.equals(m.get("date"))) {
                                        spend = (double) m.get("spend");
                                        break;
                                }
                        }

                        chartData.add(DashboardResponse.ChartDataPoint.builder()
                                        .name(dateLabel)
                                        .atual(leads)
                                        .anterior(0) // Simplified for now
                                        .build());
                }

                return chartData;
        }

        private List<DashboardResponse.GoalDTO> buildGoalDTOs(List<Goal> goals, Company company) {
                return goals.stream()
                                .map(g -> {
                                        // Calculate currentValue dynamically for LEADS goals
                                        int currentValue = g.getCurrentValue() != null ? g.getCurrentValue() : 0;

                                        System.out.println("[DEBUG] Goal ID: " + g.getId() +
                                                        ", Type: " + g.getGoalType() +
                                                        ", Company: " + (company != null ? company.getId() : "null"));

                                        if (g.getGoalType() == GoalType.LEADS && company != null) {
                                                // Use DashboardMetrics to count leads (same source as dashboard
                                                // display)
                                                LocalDate startDate = g.getStartDate() != null ? g.getStartDate()
                                                                : LocalDate.now().minusDays(365);
                                                LocalDate endDate = g.getEndDate() != null ? g.getEndDate()
                                                                : LocalDate.now();

                                                System.out.println("[DEBUG] Querying leads from " + startDate + " to "
                                                                + endDate);

                                                Integer leadsSum = metricsRepository
                                                                .sumLeadsCapturedByCompanyAndDateBetween(
                                                                                company, startDate, endDate);

                                                System.out.println("[DEBUG] leadsSum result: " + leadsSum);
                                                currentValue = leadsSum != null ? leadsSum : 0;
                                        } else {
                                                System.out.println("[DEBUG] Condition not met: goalType="
                                                                + g.getGoalType() + ", company=" + (company != null));
                                        }

                                        // Calculate progress percentage
                                        int progressPercentage = 0;
                                        if (g.getTargetValue() != null && g.getTargetValue() > 0) {
                                                progressPercentage = (int) Math.min(100,
                                                                (currentValue * 100.0 / g.getTargetValue()));
                                        }

                                        return DashboardResponse.GoalDTO.builder()
                                                        .id(g.getId())
                                                        .title(g.getTitle())
                                                        .description(g.getDescription())
                                                        .type(g.getGoalType().name())
                                                        .targetValue(g.getTargetValue())
                                                        .currentValue(currentValue)
                                                        .progressPercentage(progressPercentage)
                                                        .status(g.getStatus().name())
                                                        .isHighlighted(g.getIsHighlighted())
                                                        .startDate(g.getStartDate())
                                                        .endDate(g.getEndDate())
                                                        .build();
                                })
                                .collect(Collectors.toList());
        }

        private List<DashboardResponse.InsightDTO> buildInsightDTOs(List<AIInsight> insights) {
                return insights.stream()
                                .map(i -> DashboardResponse.InsightDTO.builder()
                                                .id(i.getId())
                                                .title(i.getTitle())
                                                .description(i.getDescription())
                                                .suggestionSource(i.getSuggestionSource())
                                                .insightType(i.getInsightType().name())
                                                .priority(i.getPriority().name())
                                                .actionUrl(i.getActionUrl())
                                                .actionLabel(i.getActionLabel())
                                                .isRead(i.getIsRead())
                                                .build())
                                .collect(Collectors.toList());
        }

        private MetricsSummaryData calculateMergedSummary(List<DashboardMetrics> localMetrics,
                        List<java.util.Map<String, Object>> metaMetrics, LocalDate startDate, int days) {

                int totalLeads = 0;
                double totalInvestment = 0.0;
                int totalClicks = 0;
                long totalImpressions = 0;

                // Sum Local Metrics (Leads)
                totalLeads = localMetrics.stream()
                                .mapToInt(m -> m.getLeadsCaptured() != null ? m.getLeadsCaptured() : 0).sum();

                // Sum Meta Metrics (Spend, Clicks, Impressions)
                for (java.util.Map<String, Object> m : metaMetrics) {
                        totalInvestment += (double) m.get("spend");
                        totalClicks += (long) m.get("clicks");
                        totalImpressions += (long) m.get("impressions");
                }

                double avgCpl = totalLeads > 0 ? totalInvestment / totalLeads : 0.0;
                double avgConversion = totalClicks > 0 ? (double) totalLeads / totalClicks * 100 : 0.0;
                double rawRoi = totalInvestment > 0 ? ((totalLeads * 100.0) - totalInvestment) / totalInvestment : 0.0;
                double avgRoi = Math.max(0.0, rawRoi);

                double avgRoas = totalInvestment > 0 ? (totalLeads * 100.0) / totalInvestment : 0.0;

                return new MetricsSummaryData(
                                totalLeads,
                                avgCpl,
                                avgConversion,
                                avgRoi,
                                avgRoas,
                                totalInvestment,
                                totalClicks,
                                totalImpressions);
        }

        private String calculateTrend(double current, double previous) {
                if (previous == 0)
                        return "0%";
                double diff = ((current - previous) / previous) * 100;
                return String.format("%.1f%%", Math.abs(diff));
        }

        private String calculateTrend(int current, int previous) {
                if (previous == 0)
                        return "0%";
                double diff = ((double) (current - previous) / previous) * 100;
                return String.format("%.0f%%", Math.abs(diff));
        }

        private String formatCurrency(double value) {
                return String.format("R$ %.2f", value).replace(".", ",");
        }

        private String formatPercentage(double value) {
                return String.format("%.1f%%", value).replace(".", ",");
        }

        private String formatRoi(double value) {
                return String.format("%.1fx", value);
        }

        private String determineOperationStatus(int score) {
                if (score == 0)
                        return "Sem dados";
                if (score >= 80)
                        return "Alta Performance";
                if (score >= 60)
                        return "Performance Estável";
                if (score >= 40)
                        return "Atenção Necessária";
                return "Performance Crítica";
        }

        private String formatNumber(long number) {
                if (number >= 1000000)
                        return String.format("%.1fM", number / 1000000.0);
                if (number >= 1000)
                        return String.format("%.1fk", number / 1000.0);
                return String.valueOf(number);
        }

        private int randomBetween(int min, int max) {
                return min + (int) (Math.random() * (max - min + 1));
        }

        /**
         * Cria uma nova meta para a empresa
         */
        @Transactional
        public DashboardResponse.GoalDTO createGoal(User user,
                        com.backend.winai.dto.request.CreateGoalRequest request) {
                Company company = user.getCompany();
                if (company == null) {
                        throw new RuntimeException("Usuário não possui empresa associada");
                }

                // Check for existing active goal of the same type
                goalRepository.findActiveGoalByCompanyAndType(company, request.getGoalType(), LocalDate.now())
                                .ifPresent(existingGoal -> {
                                        throw new RuntimeException("Já existe uma meta ativa para a categoria: " +
                                                        request.getGoalType().name()
                                                        + ". Aguarde a meta expirar ou exclua-a antes de criar uma nova.");
                                });

                Goal goal = Goal.builder()
                                .company(company)
                                .title(request.getTitle())
                                .description(request.getDescription())
                                .goalType(request.getGoalType())
                                .targetValue(request.getTargetValue())
                                .currentValue(0)
                                .yearCycle(request.getYearCycle() != null ? request.getYearCycle()
                                                : LocalDate.now().getYear())
                                .startDate(request.getStartDate() != null ? request.getStartDate() : LocalDate.now())
                                .endDate(request.getEndDate())
                                .status(GoalStatus.ACTIVE)
                                .build();

                goal = goalRepository.save(goal);

                return buildGoalDTOs(List.of(goal), company).get(0);
        }

        /**
         * Obtém todas as metas de uma empresa
         */
        @Transactional(readOnly = true)
        public List<DashboardResponse.GoalDTO> getAllGoals(User user) {
                Company company = user.getCompany();
                if (company == null) {
                        return List.of();
                }
                return buildGoalDTOs(goalRepository.findByCompanyAndYearCycleAndStatusOrderByCreatedAtDesc(company,
                                LocalDate.now().getYear(), GoalStatus.ACTIVE), company);
        }

        /**
         * Atualiza uma meta existente
         */
        @Transactional
        public DashboardResponse.GoalDTO updateGoal(User user, Long goalId,
                        com.backend.winai.dto.request.CreateGoalRequest request) {
                Goal goal = goalRepository.findById(goalId)
                                .orElseThrow(() -> new RuntimeException("Meta não encontrada"));

                if (!goal.getCompany().getId().equals(user.getCompany().getId())) {
                        throw new RuntimeException("Acesso negado");
                }

                // If changing goal type, check for existing active goal of the new type
                if (request.getGoalType() != goal.getGoalType()) {
                        goalRepository.findActiveGoalByCompanyAndType(user.getCompany(), request.getGoalType(),
                                        LocalDate.now())
                                        .ifPresent(existingGoal -> {
                                                throw new RuntimeException(
                                                                "Já existe uma meta ativa para a categoria: " +
                                                                                request.getGoalType().name());
                                        });
                }

                goal.setTitle(request.getTitle());
                goal.setDescription(request.getDescription());
                goal.setGoalType(request.getGoalType());
                goal.setTargetValue(request.getTargetValue());
                if (request.getYearCycle() != null) {
                        goal.setYearCycle(request.getYearCycle());
                }
                if (request.getStartDate() != null) {
                        goal.setStartDate(request.getStartDate());
                }
                if (request.getEndDate() != null) {
                        goal.setEndDate(request.getEndDate());
                }

                goal = goalRepository.save(goal);
                return buildGoalDTOs(List.of(goal), user.getCompany()).get(0);
        }

        /**
         * Deleta uma meta
         */
        @Transactional
        public void deleteGoal(User user, Long goalId) {
                Goal goal = goalRepository.findById(goalId)
                                .orElseThrow(() -> new RuntimeException("Meta não encontrada"));

                if (!goal.getCompany().getId().equals(user.getCompany().getId())) {
                        throw new RuntimeException("Acesso negado");
                }

                goalRepository.delete(goal);
        }

        /**
         * Alterna o destaque de uma meta (isHighlighted)
         */
        @Transactional
        public DashboardResponse.GoalDTO toggleGoalHighlight(User user, Long goalId) {
                Goal goal = goalRepository.findById(goalId)
                                .orElseThrow(() -> new RuntimeException("Meta não encontrada"));

                if (!goal.getCompany().getId().equals(user.getCompany().getId())) {
                        throw new RuntimeException("Acesso negado");
                }

                // Se estiver tentando destacar, verifica se já existem 3 destacadas
                if (!Boolean.TRUE.equals(goal.getIsHighlighted())) {
                        long count = goalRepository.findByCompanyAndYearCycleAndStatusOrderByCreatedAtDesc(
                                        user.getCompany(), LocalDate.now().getYear(), GoalStatus.ACTIVE)
                                        .stream()
                                        .filter(g -> Boolean.TRUE.equals(g.getIsHighlighted()))
                                        .count();
                        if (count >= 3) {
                                throw new RuntimeException("Máximo de 3 metas destacadas atingido");
                        }
                }

                goal.setIsHighlighted(!Boolean.TRUE.equals(goal.getIsHighlighted()));
                goal = goalRepository.save(goal);
                return buildGoalDTOs(List.of(goal), user.getCompany()).get(0);
        }

        /**
         * Gera insights usando IA com base nos dados das campanhas
         */
        @Transactional
        public void refreshAIInsights(Company company) {
                if (company == null || !openAiService.isChatEnabled())
                        return;

                List<DashboardResponse.CampaignSummaryDTO> campaigns = buildCampaignSummaries(company);
                if (campaigns.isEmpty())
                        return;

                StringBuilder analysisData = new StringBuilder();
                analysisData.append(
                                "Analise estas campanhas de marketing no Meta Ads e gere 3 insights estratégicos:\n\n");
                for (DashboardResponse.CampaignSummaryDTO c : campaigns) {
                        analysisData.append(String.format(
                                        "- Campanha: %s | Status: %s | Leads: %d | Spend: %s | CPL: %s | Conv: %s\n",
                                        c.getName(), c.getStatus(), c.getLeads(), c.getSpend(), c.getCpl(),
                                        c.getConversion()));
                }

                String systemPrompt = "Você é um especialista em Marketing Digital e Gestão de Tráfego Pago. " +
                                "Sua tarefa é analisar os dados das campanhas e sugerir melhorias práticas. " +
                                "Responda em formato de lista, onde cada item tem um título curto e uma descrição objetiva.";

                String aiResponse = openAiService.generateResponse(systemPrompt, analysisData.toString());
                if (aiResponse == null || aiResponse.isEmpty())
                        return;

                // Limpa insights antigos de otimização (opcional, ou apenas adiciona novos)
                // insightRepository.deleteByCompanyAndInsightType(company,
                // InsightType.OPTIMIZATION);

                // Lógica simples para extrair insights da resposta da IA
                // (Para um sistema real, pediríamos JSON, mas aqui vamos processar o texto)
                String[] lines = aiResponse.split("\n");
                for (String line : lines) {
                        if (line.trim().length() > 20 && (line.contains(":") || line.trim().startsWith("-")
                                        || Character.isDigit(line.trim().charAt(0)))) {
                                String title = "Insight de Performance";
                                String desc = line.trim().replaceAll("^[-0-9. ]+", "");

                                if (desc.contains(":")) {
                                        title = desc.split(":")[0].trim();
                                        desc = desc.split(":")[1].trim();
                                }

                                AIInsight insight = AIInsight.builder()
                                                .company(company)
                                                .title(title)
                                                .description(desc)
                                                .suggestionSource("WIN.AI Intelligence")
                                                .insightType(InsightType.OPTIMIZATION)
                                                .priority(InsightPriority.HIGH)
                                                .isDismissed(false)
                                                .isRead(false)
                                                .build();
                                insightRepository.save(insight);
                        }
                }
        }

        // Inner class para dados calculados
        private record MetricsSummaryData(int totalLeads, double avgCpl, double avgConversion, double avgRoi,
                        double avgRoas, double totalInvestment, int totalClicks, long totalImpressions) {
        }
}
