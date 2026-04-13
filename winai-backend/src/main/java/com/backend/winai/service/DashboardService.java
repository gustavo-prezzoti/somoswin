package com.backend.winai.service;

import com.backend.winai.dto.response.DashboardResponse;
import com.backend.winai.dto.response.LeadResponse;
import com.backend.winai.entity.*;
import com.backend.winai.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.backend.winai.dto.request.CreateGoalCheckpointRequest;
import com.backend.winai.dto.request.CreateGoalTaskRequest;
import com.backend.winai.dto.request.UpdateGoalTaskRequest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

        private final DashboardMetricsRepository metricsRepository;
        private final GoalRepository goalRepository;
        private final AIInsightRepository insightRepository;
        private final MarketingService marketingService;
        private final MetricsSyncService metricsSyncService; // Re-added
        private final OpenAiService openAiService;
        private final LeadRepository leadRepository;
        private final DashboardTaskRepository dashboardTaskRepository;
        private final GoalTaskRepository goalTaskRepository;
        private final GoalCheckpointRepository goalCheckpointRepository;

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
        @Transactional(readOnly = false)
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
                                                .findByCompanyAndIsDismissedFalseOrderByPriorityDescCreatedAtDesc(
                                                                company)
                                : List.of();
                if (company != null && !insights.isEmpty()) {
                        List<AIInsight> withButton = insights.stream()
                                        .filter(i -> i.getActionUrl() != null && !i.getActionUrl().isBlank()
                                                        && i.getActionLabel() != null && !i.getActionLabel().isBlank())
                                        .collect(Collectors.toList());
                        List<AIInsight> toDismiss = new ArrayList<>();
                        for (int idx = 0; idx < insights.size(); idx++) {
                                AIInsight i = insights.get(idx);
                                boolean hasButton = i.getActionUrl() != null && !i.getActionUrl().isBlank()
                                                && i.getActionLabel() != null && !i.getActionLabel().isBlank();
                                if (!hasButton)
                                        toDismiss.add(i);
                                else {
                                        int pos = withButton.indexOf(i);
                                        if (pos >= 3)
                                                toDismiss.add(i);
                                }
                        }
                        if (!toDismiss.isEmpty()) {
                                toDismiss.forEach(i -> i.setIsDismissed(true));
                                insightRepository.saveAll(toDismiss);
                        }
                        insights = withButton.stream().limit(3).collect(Collectors.toList());
                }

                double avgScore = localMetrics.stream()
                                .mapToDouble(m -> m.getPerformanceScore() != null ? m.getPerformanceScore() : 0)
                                .average().orElse(0.0);
                int performanceScore = (int) avgScore;

                List<Goal> allYearGoals = goalRepository.findByCompanyAndYearCycleAndStatusOrderByCreatedAtDesc(
                                company, LocalDate.now().getYear(), GoalStatus.ACTIVE);

                ensureDefaultDashboardTasks(company);
                List<DashboardResponse.DashboardTaskDTO> taskDtos = buildDashboardTaskDTOs(company);

                // Monta response
                DashboardResponse response = DashboardResponse.builder()
                                .user(buildUserSummary(user))
                                .metrics(buildMetricsSummary(currentSummary, previousSummary))
                                .chartData(buildChartData(localMetrics, metaMetrics, startDate, days))
                                .goals(buildGoalDTOs(goals, company))
                                .goalsOverview(buildGoalDTOs(allYearGoals, company))
                                .revenueGoal(buildRevenueGoalDto(company))
                                .weeklyTasks(taskDtos)
                                .insights(buildInsightDTOs(insights))
                                .campaigns(buildCampaignSummaries(company))
                                .recentLeads(buildRecentLeads(company))
                                .performanceScore(performanceScore)
                                .operationStatus(determineOperationStatus(performanceScore))
                                .build();

                return response;
        }

        private DashboardResponse.RevenueGoalDTO buildRevenueGoalDto(Company company) {
                Optional<Goal> rev = goalRepository.findActiveGoalByCompanyAndType(company, GoalType.REVENUE,
                                LocalDate.now());
                if (rev.isEmpty()) {
                        return DashboardResponse.RevenueGoalDTO.builder()
                                        .goalId(null)
                                        .targetValue(null)
                                        .currentValue(null)
                                        .progressPercentage(0)
                                        .build();
                }
                Goal g = rev.get();
                List<DashboardResponse.GoalDTO> dtos = buildGoalDTOs(List.of(g), company);
                DashboardResponse.GoalDTO dto = dtos.isEmpty() ? null : dtos.get(0);
                int progress = dto != null && dto.getProgressPercentage() != null ? dto.getProgressPercentage() : 0;
                return DashboardResponse.RevenueGoalDTO.builder()
                                .goalId(g.getId())
                                .targetValue(g.getTargetValue())
                                .currentValue(dto != null ? dto.getCurrentValue() : g.getCurrentValue())
                                .progressPercentage(progress)
                                .build();
        }

        @Transactional
        public void ensureDefaultDashboardTasks(Company company) {
                if (company == null || dashboardTaskRepository.countByCompany(company) > 0) {
                        return;
                }
                List<DashboardTask> seeds = List.of(
                                DashboardTask.builder().company(company)
                                                .title("Ajustar lances de CPC nas campanhas ativas")
                                                .category("Tráfego").priority("high").sortOrder(0).build(),
                                DashboardTask.builder().company(company)
                                                .title("Revisar script de abordagem comercial")
                                                .category("Vendas").priority("medium").sortOrder(1).build(),
                                DashboardTask.builder().company(company)
                                                .title("Subir novos criativos aprovados")
                                                .category("Tráfego").priority("high").sortOrder(2).build(),
                                DashboardTask.builder().company(company)
                                                .title("Analisar taxa de conversão da landing principal")
                                                .category("Métricas").priority("medium").sortOrder(3).build());
                dashboardTaskRepository.saveAll(seeds);
        }

        private List<DashboardResponse.DashboardTaskDTO> buildDashboardTaskDTOs(Company company) {
                if (company == null) {
                        return List.of();
                }
                return dashboardTaskRepository.findByCompanyOrderBySortOrderAscIdAsc(company).stream()
                                .map(t -> DashboardResponse.DashboardTaskDTO.builder()
                                                .id(t.getId())
                                                .title(t.getTitle())
                                                .category(t.getCategory())
                                                .priority(t.getPriority())
                                                .completed(t.getCompleted())
                                                .sortOrder(t.getSortOrder())
                                                .build())
                                .collect(Collectors.toList());
        }

        @Transactional
        public DashboardResponse.DashboardTaskDTO toggleDashboardTask(User user, Long taskId) {
                Company company = user.getCompany();
                if (company == null) {
                        throw new RuntimeException("Usuário não possui empresa associada");
                }
                DashboardTask task = dashboardTaskRepository.findById(taskId)
                                .orElseThrow(() -> new RuntimeException("Tarefa não encontrada"));
                if (!task.getCompany().getId().equals(company.getId())) {
                        throw new RuntimeException("Acesso negado");
                }
                task.setCompleted(!Boolean.TRUE.equals(task.getCompleted()));
                task = dashboardTaskRepository.save(task);
                return DashboardResponse.DashboardTaskDTO.builder()
                                .id(task.getId())
                                .title(task.getTitle())
                                .category(task.getCategory())
                                .priority(task.getPriority())
                                .completed(task.getCompleted())
                                .sortOrder(task.getSortOrder())
                                .build();
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

                // Gera insights iniciais específicos do Amplia 2026
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
                                                .title("Performance de Campanhas")
                                                .description("Suas **campanhas de tráfego** mostram oportunidade de escala. Revise criativos e orçamento no painel de Tráfego Pago.")
                                                .suggestionSource("Agente de Tráfego")
                                                .insightType(InsightType.SUGGESTION)
                                                .priority(InsightPriority.MEDIUM)
                                                .actionUrl("/campanhas")
                                                .actionLabel("Abrir Tráfego Pago")
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
                return buildGoalDTOs(goals, company, null);
        }

        private List<DashboardResponse.GoalDTO> buildGoalDTOs(List<Goal> goals, Company company,
                        Integer planningMonth) {
                if (goals.isEmpty()) {
                        return List.of();
                }
                List<Long> ids = goals.stream().map(Goal::getId).collect(Collectors.toList());
                Map<Long, List<GoalTask>> tasksByGoal = new HashMap<>();
                for (GoalTask t : goalTaskRepository.findByGoal_IdIn(ids)) {
                        Long gid = t.getGoal().getId();
                        tasksByGoal.computeIfAbsent(gid, k -> new ArrayList<>()).add(t);
                }
                Map<Long, List<GoalCheckpoint>> cpByGoal = new HashMap<>();
                for (GoalCheckpoint c : goalCheckpointRepository.findByGoal_IdIn(ids)) {
                        Long gid = c.getGoal().getId();
                        cpByGoal.computeIfAbsent(gid, k -> new ArrayList<>()).add(c);
                }

                final Integer month = planningMonth != null && planningMonth >= 1 && planningMonth <= 3
                                ? planningMonth
                                : null;

                return goals.stream()
                                .map(g -> {
                                        int currentValue = g.getCurrentValue() != null ? g.getCurrentValue() : 0;

                                        if (g.getGoalType() == GoalType.LEADS && company != null) {
                                                LocalDate startDate = g.getStartDate() != null ? g.getStartDate()
                                                                : LocalDate.now().minusDays(365);
                                                LocalDate endDate = g.getEndDate() != null ? g.getEndDate()
                                                                : LocalDate.now();

                                                Integer leadsSum = metricsRepository
                                                                .sumLeadsCapturedByCompanyAndDateBetween(
                                                                                company, startDate, endDate);

                                                currentValue = leadsSum != null ? leadsSum : 0;
                                        }

                                        int progressPercentage = 0;
                                        if (g.getTargetValue() != null && g.getTargetValue() > 0) {
                                                progressPercentage = (int) Math.min(100,
                                                                (currentValue * 100.0 / g.getTargetValue()));
                                        }

                                        List<GoalTask> taskList = tasksByGoal.getOrDefault(g.getId(), List.of());
                                        Integer executionPct = computeExecutionProgress(taskList);
                                        if (executionPct == null) {
                                                executionPct = progressPercentage;
                                        }

                                        Integer expectedPct = null;
                                        if (month != null) {
                                                expectedPct = (int) Math.min(100,
                                                                Math.round(month * 100.0 / 3.0));
                                        }

                                        List<DashboardResponse.GoalTaskDTO> taskDtos = taskList.stream()
                                                        .map(this::toGoalTaskDto)
                                                        .collect(Collectors.toList());
                                        List<DashboardResponse.GoalCheckpointDTO> cpDtos = cpByGoal
                                                        .getOrDefault(g.getId(), List.of()).stream()
                                                        .map(this::toGoalCheckpointDto)
                                                        .collect(Collectors.toList());

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
                                                        .yearCycle(g.getYearCycle())
                                                        .createdAt(g.getCreatedAt())
                                                        .color(g.getColor())
                                                        .prazoDias(g.getPrazoDias())
                                                        .scenario(g.getScenario())
                                                        .unit(g.getUnit())
                                                        .progressoResultado(g.getProgressoResultado())
                                                        .executionProgressPercentage(executionPct)
                                                        .expectedProgressPercentage(expectedPct)
                                                        .tasks(taskDtos)
                                                        .checkpoints(cpDtos)
                                                        .build();
                                })
                                .collect(Collectors.toList());
        }

        private Integer computeExecutionProgress(List<GoalTask> tasks) {
                if (tasks == null || tasks.isEmpty()) {
                        return null;
                }
                int totalW = tasks.stream().mapToInt(t -> t.getWeight() != null ? t.getWeight() : 1).sum();
                if (totalW <= 0) {
                        return null;
                }
                int doneW = tasks.stream()
                                .filter(t -> Boolean.TRUE.equals(t.getCompleted()))
                                .mapToInt(t -> t.getWeight() != null ? t.getWeight() : 1)
                                .sum();
                return (int) Math.min(100, Math.round(doneW * 100.0 / totalW));
        }

        private DashboardResponse.GoalTaskDTO toGoalTaskDto(GoalTask t) {
                LocalDateTime ca = t.getCompletedAt();
                String completedAtStr = ca == null ? null : ca.toString();
                return DashboardResponse.GoalTaskDTO.builder()
                                .id(t.getId())
                                .title(t.getTitle())
                                .description(t.getDescription())
                                .week(t.getWeek())
                                .level(t.getLevel() != null ? t.getLevel().name().toLowerCase() : null)
                                .weight(t.getWeight())
                                .completed(t.getCompleted())
                                .completedAt(completedAtStr)
                                .deadline(t.getDeadline())
                                .status(t.getTaskStatus() != null ? t.getTaskStatus().name() : null)
                                .evidenciaObrigatoria(t.getEvidenciaObrigatoria())
                                .evidenciaJson(t.getEvidenciaJson())
                                .sortOrder(t.getSortOrder())
                                .build();
        }

        private DashboardResponse.GoalCheckpointDTO toGoalCheckpointDto(GoalCheckpoint c) {
                return DashboardResponse.GoalCheckpointDTO.builder()
                                .id(c.getId())
                                .dataPrevista(c.getDataPrevista())
                                .dataRealizada(c.getDataRealizada())
                                .semana(c.getSemana())
                                .status(c.getStatus())
                                .analiseIaJson(c.getAnaliseIaJson())
                                .ajustesSugeridosJson(c.getAjustesSugeridosJson())
                                .sortOrder(c.getSortOrder())
                                .build();
        }

        private void appendTasksFromRequest(Goal goal, List<CreateGoalTaskRequest> requests) {
                int order = 0;
                for (CreateGoalTaskRequest r : requests) {
                        int so = r.getSortOrder() != null ? r.getSortOrder() : order;
                        GoalTask t = GoalTask.builder()
                                        .goal(goal)
                                        .title(r.getTitle())
                                        .description(r.getDescription())
                                        .week(r.getWeek())
                                        .level(r.getLevel())
                                        .weight(r.getWeight() != null ? r.getWeight() : 1)
                                        .deadline(r.getDeadline())
                                        .evidenciaObrigatoria(Boolean.TRUE.equals(r.getEvidenciaObrigatoria()))
                                        .evidenciaJson(r.getEvidenciaJson())
                                        .sortOrder(so)
                                        .build();
                        goal.getGoalTasks().add(t);
                        order++;
                }
        }

        private void appendCheckpointsFromRequest(Goal goal, List<CreateGoalCheckpointRequest> requests) {
                int order = 0;
                for (CreateGoalCheckpointRequest r : requests) {
                        int so = r.getSortOrder() != null ? r.getSortOrder() : order;
                        GoalCheckpoint c = GoalCheckpoint.builder()
                                        .goal(goal)
                                        .dataPrevista(r.getDataPrevista())
                                        .dataRealizada(r.getDataRealizada())
                                        .semana(r.getSemana())
                                        .status(r.getStatus())
                                        .analiseIaJson(r.getAnaliseIaJson())
                                        .ajustesSugeridosJson(r.getAjustesSugeridosJson())
                                        .sortOrder(so)
                                        .build();
                        goal.getGoalCheckpoints().add(c);
                        order++;
                }
        }

        /**
         * Tarefas padrão alinhadas à UI de Metas e Objetivos (uma meta nova sem payload de tarefas).
         */
        private void seedDefaultOperationalTasks(Goal goal) {
                int y = goal.getYearCycle() != null ? goal.getYearCycle() : LocalDate.now().getYear();
                String label = goal.getGoalType().name();
                LocalDate base = goal.getStartDate() != null ? goal.getStartDate() : LocalDate.of(y, 1, 1);
                int order = 0;
                addSeedTask(goal, base, order++, "Triagem e alinhamento — " + label, 1, GoalTaskLevel.RAPIDA, 1, false,
                                3);
                addSeedTask(goal, base, order++, "Definir indicadores — " + label, 1, GoalTaskLevel.RAPIDA, 1, false,
                                5);
                addSeedTask(goal, base, order++, "Execução tática — " + label, 2, GoalTaskLevel.MEDIA, 2, false, 10);
                addSeedTask(goal, base, order++, "Revisão estratégica do funil", 2, GoalTaskLevel.ESTRATEGICA, 3, true,
                                12);
                addSeedTask(goal, base, order++, "Medição e ajuste — " + label, 3, GoalTaskLevel.MEDIA, 2, false, 18);
                addSeedTask(goal, base, order, "Fechamento do ciclo — " + label, 4, GoalTaskLevel.RAPIDA, 1, false, 22);
        }

        private void addSeedTask(Goal goal, LocalDate base, int sortOrder, String title, int week,
                        GoalTaskLevel level, int weight, boolean evidencia, int dayOfMonth) {
                int dim = Math.min(dayOfMonth, base.lengthOfMonth());
                LocalDate deadline = base.withDayOfMonth(dim);
                GoalTask t = GoalTask.builder()
                                .goal(goal)
                                .title(title)
                                .description(goal.getDescription())
                                .week(week)
                                .level(level)
                                .weight(weight)
                                .deadline(deadline)
                                .evidenciaObrigatoria(evidencia)
                                .sortOrder(sortOrder)
                                .build();
                goal.getGoalTasks().add(t);
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
                                .currentValue(request.getCurrentValue() != null ? request.getCurrentValue() : 0)
                                .yearCycle(request.getYearCycle() != null ? request.getYearCycle()
                                                : LocalDate.now().getYear())
                                .startDate(request.getStartDate() != null ? request.getStartDate() : LocalDate.now())
                                .endDate(request.getEndDate())
                                .status(GoalStatus.ACTIVE)
                                .color(request.getColor() != null ? request.getColor() : "bg-emerald-500")
                                .prazoDias(request.getPrazoDias() != null ? request.getPrazoDias() : 30)
                                .scenario(request.getScenario())
                                .unit(request.getUnit() != null ? request.getUnit() : "%")
                                .progressoResultado(request.getProgressoResultado())
                                .build();

                goal = goalRepository.save(goal);

                if (request.getTasks() != null && !request.getTasks().isEmpty()) {
                        appendTasksFromRequest(goal, request.getTasks());
                } else {
                        seedDefaultOperationalTasks(goal);
                }
                if (request.getCheckpoints() != null && !request.getCheckpoints().isEmpty()) {
                        appendCheckpointsFromRequest(goal, request.getCheckpoints());
                }
                goal = goalRepository.save(goal);

                return buildGoalDTOs(List.of(goal), company).get(0);
        }

        /**
         * Obtém todas as metas de uma empresa
         */
        @Transactional(readOnly = true)
        public List<DashboardResponse.GoalDTO> getAllGoals(User user, Integer year, Integer planningMonth) {
                Company company = user.getCompany();
                if (company == null) {
                        return List.of();
                }
                int y = year != null ? year : LocalDate.now().getYear();
                return buildGoalDTOs(goalRepository.findByCompanyAndYearCycleAndStatusOrderByCreatedAtDesc(company,
                                y, GoalStatus.ACTIVE), company, planningMonth);
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
                if (request.getCurrentValue() != null) {
                        goal.setCurrentValue(request.getCurrentValue());
                }
                if (request.getColor() != null) {
                        goal.setColor(request.getColor());
                }
                if (request.getPrazoDias() != null) {
                        goal.setPrazoDias(request.getPrazoDias());
                }
                if (request.getScenario() != null) {
                        goal.setScenario(request.getScenario());
                }
                if (request.getUnit() != null) {
                        goal.setUnit(request.getUnit());
                }
                if (request.getProgressoResultado() != null) {
                        goal.setProgressoResultado(request.getProgressoResultado());
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

                // Se estiver tentando destacar, verifica se já existem 3 destacadas no mesmo ciclo
                if (!Boolean.TRUE.equals(goal.getIsHighlighted())) {
                        int cycleYear = goal.getYearCycle() != null ? goal.getYearCycle()
                                        : LocalDate.now().getYear();
                        long count = goalRepository.findByCompanyAndYearCycleAndStatusOrderByCreatedAtDesc(
                                        user.getCompany(), cycleYear, GoalStatus.ACTIVE)
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

        @Transactional
        public DashboardResponse.GoalTaskDTO addGoalTask(User user, Long goalId,
                        CreateGoalTaskRequest request) {
                Goal goal = goalRepository.findById(goalId)
                                .orElseThrow(() -> new RuntimeException("Meta não encontrada"));
                if (!goal.getCompany().getId().equals(user.getCompany().getId())) {
                        throw new RuntimeException("Acesso negado");
                }
                int nextOrder = goal.getGoalTasks().stream()
                                .mapToInt(t -> t.getSortOrder() != null ? t.getSortOrder() : 0)
                                .max()
                                .orElse(-1) + 1;
                GoalTask t = GoalTask.builder()
                                .goal(goal)
                                .title(request.getTitle())
                                .description(request.getDescription())
                                .week(request.getWeek())
                                .level(request.getLevel())
                                .weight(request.getWeight() != null ? request.getWeight() : 1)
                                .deadline(request.getDeadline())
                                .evidenciaObrigatoria(Boolean.TRUE.equals(request.getEvidenciaObrigatoria()))
                                .evidenciaJson(request.getEvidenciaJson())
                                .sortOrder(request.getSortOrder() != null ? request.getSortOrder() : nextOrder)
                                .build();
                goal.getGoalTasks().add(t);
                goalRepository.save(goal);
                return toGoalTaskDto(t);
        }

        @Transactional
        public DashboardResponse.GoalTaskDTO updateGoalTask(User user, Long goalId, Long taskId,
                        UpdateGoalTaskRequest request) {
                GoalTask t = goalTaskRepository.findById(taskId)
                                .orElseThrow(() -> new RuntimeException("Tarefa não encontrada"));
                if (!t.getGoal().getId().equals(goalId)) {
                        throw new RuntimeException("Tarefa não pertence a esta meta");
                }
                if (!t.getGoal().getCompany().getId().equals(user.getCompany().getId())) {
                        throw new RuntimeException("Acesso negado");
                }
                if (request.getTitle() != null) {
                        t.setTitle(request.getTitle());
                }
                if (request.getDescription() != null) {
                        t.setDescription(request.getDescription());
                }
                if (request.getWeek() != null) {
                        t.setWeek(request.getWeek());
                }
                if (request.getLevel() != null) {
                        t.setLevel(request.getLevel());
                }
                if (request.getWeight() != null) {
                        t.setWeight(request.getWeight());
                }
                if (request.getDeadline() != null) {
                        t.setDeadline(request.getDeadline());
                }
                if (request.getEvidenciaObrigatoria() != null) {
                        t.setEvidenciaObrigatoria(request.getEvidenciaObrigatoria());
                }
                if (request.getEvidenciaJson() != null) {
                        t.setEvidenciaJson(request.getEvidenciaJson());
                }
                if (request.getSortOrder() != null) {
                        t.setSortOrder(request.getSortOrder());
                }
                if (request.getCompleted() != null) {
                        t.setCompleted(request.getCompleted());
                        if (Boolean.TRUE.equals(request.getCompleted())) {
                                t.setCompletedAt(LocalDateTime.now());
                                t.setTaskStatus(GoalTaskStatus.concluido);
                        } else {
                                t.setCompletedAt(null);
                                t.setTaskStatus(GoalTaskStatus.pendente);
                        }
                }
                t = goalTaskRepository.save(t);
                return toGoalTaskDto(t);
        }

        @Transactional
        public void deleteGoalTask(User user, Long goalId, Long taskId) {
                GoalTask t = goalTaskRepository.findById(taskId)
                                .orElseThrow(() -> new RuntimeException("Tarefa não encontrada"));
                if (!t.getGoal().getId().equals(goalId)) {
                        throw new RuntimeException("Tarefa não pertence a esta meta");
                }
                if (!t.getGoal().getCompany().getId().equals(user.getCompany().getId())) {
                        throw new RuntimeException("Acesso negado");
                }
                goalTaskRepository.delete(t);
        }

        @Transactional
        public DashboardResponse.GoalCheckpointDTO addGoalCheckpoint(User user, Long goalId,
                        CreateGoalCheckpointRequest request) {
                Goal goal = goalRepository.findById(goalId)
                                .orElseThrow(() -> new RuntimeException("Meta não encontrada"));
                if (!goal.getCompany().getId().equals(user.getCompany().getId())) {
                        throw new RuntimeException("Acesso negado");
                }
                int nextOrder = goal.getGoalCheckpoints().stream()
                                .mapToInt(c -> c.getSortOrder() != null ? c.getSortOrder() : 0)
                                .max()
                                .orElse(-1) + 1;
                GoalCheckpoint c = GoalCheckpoint.builder()
                                .goal(goal)
                                .dataPrevista(request.getDataPrevista())
                                .dataRealizada(request.getDataRealizada())
                                .semana(request.getSemana())
                                .status(request.getStatus())
                                .analiseIaJson(request.getAnaliseIaJson())
                                .ajustesSugeridosJson(request.getAjustesSugeridosJson())
                                .sortOrder(request.getSortOrder() != null ? request.getSortOrder() : nextOrder)
                                .build();
                goal.getGoalCheckpoints().add(c);
                goalRepository.save(goal);
                return toGoalCheckpointDto(c);
        }

        @Transactional
        public void deleteGoalCheckpoint(User user, Long goalId, Long checkpointId) {
                GoalCheckpoint c = goalCheckpointRepository.findById(checkpointId)
                                .orElseThrow(() -> new RuntimeException("Checkpoint não encontrado"));
                if (!c.getGoal().getId().equals(goalId)) {
                        throw new RuntimeException("Checkpoint não pertence a esta meta");
                }
                if (!c.getGoal().getCompany().getId().equals(user.getCompany().getId())) {
                        throw new RuntimeException("Acesso negado");
                }
                goalCheckpointRepository.delete(c);
        }

        /**
         * Gera insights usando IA com base nos dados das campanhas.
         * REQUIRES_NEW garante transação read-write isolada por empresa, evitando
         * "cannot execute INSERT in a read-only transaction" quando chamado pelo scheduler.
         */
        @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = false)
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
                                                .suggestionSource("Amplia Intelligence")
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
