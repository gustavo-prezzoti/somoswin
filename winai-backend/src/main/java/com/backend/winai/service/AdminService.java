package com.backend.winai.service;

import com.backend.winai.dto.request.AdminCreateUserRequest;
import com.backend.winai.dto.request.AdminEscutaStartRequest;
import com.backend.winai.dto.request.IntelligentListeningStartRequest;
import com.backend.winai.dto.request.AdminUpdateUserRequest;
import com.backend.winai.dto.request.UpdateInstanceConfigRequest;
import com.backend.winai.dto.marketing.CampaignsListResponse;
import com.backend.winai.dto.response.AdminConversationSummaryResponse;
import com.backend.winai.dto.response.AdminEscutaSessionResponse;
import com.backend.winai.dto.response.AdminGoalCompanyRowResponse;
import com.backend.winai.dto.response.AdminGoalsForCompanyResponse;
import com.backend.winai.dto.response.AdminMetaAdsCompanyResponse;
import com.backend.winai.dto.response.AdminNotificationRowResponse;
import com.backend.winai.dto.response.AdminPerformanceSnapshotResponse;
import com.backend.winai.dto.response.AdminDashboardResponse;
import com.backend.winai.dto.response.DashboardResponse;
import com.backend.winai.dto.response.AdminInstanceResponse;
import com.backend.winai.dto.response.AdminLeadResponse;
import com.backend.winai.dto.response.AdminMeetingRowResponse;
import com.backend.winai.dto.response.AdminUserResponse;
import com.backend.winai.dto.response.MeetingResponse;
import com.backend.winai.dto.response.IntelligentListeningSessionResponse;
import com.backend.winai.dto.response.WhatsAppMessageResponse;
import com.backend.winai.dto.uazap.UazapInstanceDTO;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.User;
import com.backend.winai.entity.UserRole;
import com.backend.winai.repository.CompanyRepository;
import com.backend.winai.repository.UserRepository;
import com.backend.winai.repository.WhatsAppConversationRepository;
import com.backend.winai.repository.WhatsAppMessageRepository;
import com.backend.winai.repository.UserWhatsAppConnectionRepository;
import com.backend.winai.repository.KnowledgeBaseConnectionRepository;
import com.backend.winai.repository.DashboardTaskRepository;
import com.backend.winai.repository.LeadRepository;
import com.backend.winai.repository.KnowledgeBaseRepository;
import com.backend.winai.repository.KnowledgeBaseChunkRepository;
import com.backend.winai.repository.MeetingRepository;
import com.backend.winai.repository.SocialMediaProfileRepository;
import com.backend.winai.repository.SocialGrowthChatRepository;
import com.backend.winai.repository.MetaConnectionRepository;
import com.backend.winai.repository.GoogleDriveConnectionRepository;
import com.backend.winai.repository.GoalRepository;
import com.backend.winai.repository.NotificationRepository;
import com.backend.winai.repository.RefreshTokenRepository;
import com.backend.winai.repository.AIInsightRepository;
import com.backend.winai.repository.DashboardMetricsRepository;
import com.backend.winai.repository.InstagramMetricRepository;
import com.backend.winai.repository.MetaCampaignRepository;
import com.backend.winai.repository.MetaAdSetRepository;
import com.backend.winai.repository.MetaAdRepository;
import com.backend.winai.repository.MetaInsightRepository;
import com.backend.winai.repository.PlanRepository;
import com.backend.winai.repository.AiRecommendationCacheRepository;
import com.backend.winai.repository.AgendamentoConfigRepository;
import com.backend.winai.repository.FollowUpConfigRepository;
import com.backend.winai.repository.FollowUpStatusRepository;
import com.backend.winai.repository.GlobalNotificationConfigRepository;
import com.backend.winai.repository.TrafficAdvisorChatRepository;
import com.backend.winai.entity.Lead;
import com.backend.winai.entity.LeadStatus;
import com.backend.winai.entity.GoalStatus;
import com.backend.winai.entity.MetaConnection;
import com.backend.winai.entity.Meeting;
import com.backend.winai.entity.MeetingKind;
import com.backend.winai.entity.MeetingStatus;
import com.backend.winai.entity.Notification;
import com.backend.winai.entity.UserWhatsAppConnection;
import com.backend.winai.entity.WhatsAppConversation;
import com.backend.winai.entity.KnowledgeBase;
import com.backend.winai.dto.request.AdminMeetingCreateRequest;
import com.backend.winai.dto.request.MeetingRequest;
import com.backend.winai.dto.request.CreateUserWhatsAppConnectionRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AdminService {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final WhatsAppMessageRepository messageRepository;
    private final WhatsAppConversationRepository conversationRepository;
    private final UserWhatsAppConnectionRepository connectionRepository;
    private final KnowledgeBaseConnectionRepository knowledgeBaseConnectionRepository;
    private final LeadRepository leadRepository;
    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final KnowledgeBaseChunkRepository knowledgeBaseChunkRepository;
    private final DashboardTaskRepository dashboardTaskRepository;
    private final MeetingRepository meetingRepository;
    private final SocialMediaProfileRepository socialMediaProfileRepository;
    private final SocialGrowthChatRepository socialGrowthChatRepository;
    private final MetaConnectionRepository metaConnectionRepository;
    private final GoogleDriveConnectionRepository googleDriveConnectionRepository;
    private final GoalRepository goalRepository;
    private final NotificationRepository notificationRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AIInsightRepository aiInsightRepository;
    private final DashboardMetricsRepository dashboardMetricsRepository;
    private final InstagramMetricRepository instagramMetricRepository;
    private final MetaCampaignRepository metaCampaignRepository;
    private final MetaAdSetRepository metaAdSetRepository;
    private final MetaAdRepository metaAdRepository;
    private final MetaInsightRepository metaInsightRepository;
    private final PlanRepository planRepository;
    private final CompanyAiPolicy companyAiPolicy;
    private final AiRecommendationCacheRepository aiRecommendationCacheRepository;
    private final AgendamentoConfigRepository agendamentoConfigRepository;
    private final FollowUpConfigRepository followUpConfigRepository;
    private final FollowUpStatusRepository followUpStatusRepository;
    private final GlobalNotificationConfigRepository globalNotificationConfigRepository;
    private final TrafficAdvisorChatRepository trafficAdvisorChatRepository;
    private final AsaasService asaasService;
    private final UazapService uazapService;
    private final WhatsAppChatService whatsAppChatService;
    private final IntelligentListeningService intelligentListeningService;
    private final MarketingService marketingService;
    private final MetaSyncService metaSyncService;
    private final DashboardService dashboardService;
    private final MeetingService meetingService;
    private final PasswordEncoder passwordEncoder;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${uazap.default-base-url}")
    private String defaultBaseUrl;

    @Value("${uazap.admin-token:}")
    private String adminToken;

    // ========== ESTATÍSTICAS ==========

    /**
     * Obtém estatísticas gerais do sistema
     */
    public Map<String, Object> getSystemStats() {
        Map<String, Object> stats = new HashMap<>();

        stats.put("totalUsers", userRepository.count());
        stats.put("totalMessages", messageRepository.count());
        stats.put("totalConversations", conversationRepository.count());

        try {
            List<UazapInstanceDTO> instances = uazapService.fetchInstances();
            stats.put("totalInstances", instances.size());
            stats.put("connectedInstances", instances.stream()
                    .filter(i -> "open".equalsIgnoreCase(i.getStatus()) || "connected".equalsIgnoreCase(i.getStatus()))
                    .count());
        } catch (Exception e) {
            log.error("Erro ao buscar instâncias para stats", e);
            stats.put("totalInstances", 0);
            stats.put("connectedInstances", 0);
        }

        return stats;
    }

    /**
     * Painel admin estilo Amplia: KPIs, próximos encontros e alertas recentes.
     */
    public AdminDashboardResponse getAdminDashboard() {
        LocalDate today = LocalDate.now(ZoneId.systemDefault());
        LocalDate startWeek = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate endWeek = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));

        long totalCompanies = companyRepository.count();
        ZonedDateTime monthStart = today.withDayOfMonth(1).atStartOfDay(ZoneId.systemDefault());
        long newCompaniesMonth = companyRepository.countByCreatedAtAfter(monthStart);

        long incompleteTasks = dashboardTaskRepository.countByCompletedFalse();
        long meetingsWeek = meetingRepository.countByMeetingDateBetween(startWeek, endWeek);

        String newCompaniesSubtitle = "+" + newCompaniesMonth + " este mês";

        List<AdminDashboardResponse.Kpi> kpis = List.of(
                AdminDashboardResponse.Kpi.builder()
                        .label("CLIENTES TOTAIS")
                        .value(String.valueOf(totalCompanies))
                        .subtitle(newCompaniesSubtitle)
                        .icon("USERS")
                        .build(),
                AdminDashboardResponse.Kpi.builder()
                        .label("CHECKPOINTS")
                        .value(String.valueOf(incompleteTasks))
                        .subtitle("Tarefas incompletas (dashboard)")
                        .icon("CLOCK")
                        .build(),
                AdminDashboardResponse.Kpi.builder()
                        .label("ENCONTROS SEMANA")
                        .value(String.valueOf(meetingsWeek))
                        .subtitle("Semana corrente")
                        .icon("CALENDAR")
                        .build(),
                AdminDashboardResponse.Kpi.builder()
                        .label("FATURAMENTO")
                        .value("—")
                        .subtitle("Em breve")
                        .icon("DOLLAR")
                        .build());

        LocalDate horizonEnd = today.plusWeeks(2);
        List<Meeting> rawMeetings = meetingRepository.findAllByMeetingDateBetweenWithCompany(today, horizonEnd);
        List<AdminDashboardResponse.MeetingRow> meetingRows = rawMeetings.stream()
                .limit(15)
                .map(m -> AdminDashboardResponse.MeetingRow.builder()
                        .id(m.getId().toString())
                        .title(m.getTitle())
                        .companyName(m.getCompany() != null ? m.getCompany().getName() : "—")
                        .meetingDate(m.getMeetingDate().toString())
                        .meetingTime(m.getMeetingTime().toString())
                        .status(m.getStatus() != null ? m.getStatus().name() : "")
                        .build())
                .collect(Collectors.toList());

        List<Notification> notifs = notificationRepository.findTop12ByOrderByCreatedAtDesc();
        List<AdminDashboardResponse.AlertRow> alerts = notifs.stream()
                .map(n -> AdminDashboardResponse.AlertRow.builder()
                        .id(n.getId().toString())
                        .title(n.getTitle())
                        .message(n.getMessage() != null ? n.getMessage() : "")
                        .type(n.getType() != null ? n.getType() : "INFO")
                        .createdAt(n.getCreatedAt() != null ? n.getCreatedAt().toString() : "")
                        .read(Boolean.TRUE.equals(n.getRead()))
                        .build())
                .collect(Collectors.toList());

        return AdminDashboardResponse.builder()
                .kpis(kpis)
                .upcomingMeetings(meetingRows)
                .priorityAlerts(alerts)
                .build();
    }

    // ========== ALERTAS (NOTIFICAÇÕES) ==========

    public Page<AdminNotificationRowResponse> getAdminNotifications(int page, int size, UUID companyId, Boolean read) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return notificationRepository.findAdminPage(companyId, read, pageable).map(this::toAdminNotificationRow);
    }

    private AdminNotificationRowResponse toAdminNotificationRow(Notification n) {
        String companyIdStr = null;
        String companyName = null;
        if (n.getCompany() != null) {
            companyIdStr = n.getCompany().getId().toString();
            companyName = n.getCompany().getName();
        }
        String userName = null;
        String userEmail = null;
        if (n.getUser() != null) {
            userName = n.getUser().getName();
            userEmail = n.getUser().getEmail();
        }
        return AdminNotificationRowResponse.builder()
                .id(n.getId().toString())
                .title(n.getTitle())
                .message(n.getMessage() != null ? n.getMessage() : "")
                .type(n.getType() != null ? n.getType() : "INFO")
                .createdAt(n.getCreatedAt() != null ? n.getCreatedAt().toString() : "")
                .read(Boolean.TRUE.equals(n.getRead()))
                .companyId(companyIdStr)
                .companyName(companyName)
                .userName(userName)
                .userEmail(userEmail)
                .relatedEntityType(n.getRelatedEntityType())
                .actionUrl(n.getActionUrl())
                .build();
    }

    @Transactional
    public void markAdminNotificationRead(UUID id) {
        Notification n = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notificação não encontrada"));
        n.setRead(true);
    }

    // ========== PERFORMANCE (SNAPSHOT AGREGADO) ==========

    public AdminPerformanceSnapshotResponse getAdminPerformanceSnapshot() {
        LocalDate today = LocalDate.now(ZoneId.systemDefault());
        LocalDate startWeek = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate endWeek = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
        ZonedDateTime monthStart = today.withDayOfMonth(1).atStartOfDay(ZoneId.systemDefault());

        long totalCompanies = companyRepository.count();
        long newCompaniesMonth = companyRepository.countByCreatedAtAfter(monthStart);
        long totalLeads = leadRepository.count();
        long leadsWon = leadRepository.countByStatus(LeadStatus.WON);
        long meetingsWeek = meetingRepository.countByMeetingDateBetween(startWeek, endWeek);
        long incompleteTasks = dashboardTaskRepository.countByCompletedFalse();

        Double spend = metaCampaignRepository.sumTotalSpend();
        Long impressions = metaCampaignRepository.sumTotalImpressions();
        Long clicks = metaCampaignRepository.sumTotalClicks();
        Long reach = metaCampaignRepository.sumTotalReach();
        Long conversions = metaCampaignRepository.sumTotalConversions();
        long campaignCount = metaCampaignRepository.count();
        long metaAccountsConnected = metaConnectionRepository.countByIsConnectedTrueAndAdAccountIdIsNotNull();

        double ctrGlobal = (impressions != null && impressions > 0 && clicks != null)
                ? (clicks * 100.0 / impressions)
                : 0.0;

        long activeGoalsTotal = getAdminGoalCompanyRows(null).stream()
                .mapToLong(AdminGoalCompanyRowResponse::getActiveGoalsCount)
                .sum();

        List<AdminPerformanceSnapshotResponse.CompanyPerformanceRow> topCompanies = metaCampaignRepository
                .aggregateSpendByCompany()
                .stream()
                .limit(10)
                .map(row -> {
                    UUID cid = (UUID) row[0];
                    double sp = row[2] != null ? ((Number) row[2]).doubleValue() : 0.0;
                    long im = row[3] != null ? ((Number) row[3]).longValue() : 0L;
                    long cl = row[4] != null ? ((Number) row[4]).longValue() : 0L;
                    long cnt = row[5] != null ? ((Number) row[5]).longValue() : 0L;
                    return AdminPerformanceSnapshotResponse.CompanyPerformanceRow.builder()
                            .companyId(cid.toString())
                            .companyName((String) row[1])
                            .spend(sp)
                            .impressions(im)
                            .clicks(cl)
                            .campaignCount((int) Math.min(cnt, Integer.MAX_VALUE))
                            .build();
                })
                .collect(Collectors.toList());

        return AdminPerformanceSnapshotResponse.builder()
                .totalCompanies(totalCompanies)
                .newCompaniesThisMonth(newCompaniesMonth)
                .totalLeads(totalLeads)
                .leadsWon(leadsWon)
                .meetingsThisWeek(meetingsWeek)
                .incompleteDashboardTasks(incompleteTasks)
                .metaCampaignsCount(campaignCount)
                .metaAccountsConnected(metaAccountsConnected)
                .totalSpend(spend != null ? spend : 0.0)
                .totalImpressions(impressions != null ? impressions : 0L)
                .totalClicks(clicks != null ? clicks : 0L)
                .totalReach(reach != null ? reach : 0L)
                .totalConversions(conversions != null ? conversions : 0L)
                .ctrGlobal(ctrGlobal)
                .activeGoalsTotal(activeGoalsTotal)
                .topCompaniesBySpend(topCompanies)
                .build();
    }

    // ========== ESCUTA INTELIGENTE (ADMIN GLOBAL) ==========

    public Page<AdminEscutaSessionResponse> getAdminEscutaSessions(int page, int size, String q) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Meeting> meetings;
        if (q != null && !q.trim().isEmpty()) {
            meetings = meetingRepository.searchByMeetingKindAndQuery(MeetingKind.INTELLIGENT_LISTENING, q.trim(),
                    pageable);
        } else {
            meetings = meetingRepository.findByMeetingKindOrderByCreatedAtDesc(MeetingKind.INTELLIGENT_LISTENING,
                    pageable);
        }
        return meetings.map(this::toAdminEscuta);
    }

    public AdminEscutaSessionResponse getAdminEscutaSession(UUID id) {
        return toAdminEscuta(loadEscutaMeeting(id));
    }

    @Transactional
    public AdminEscutaSessionResponse startAdminEscuta(AdminEscutaStartRequest request) {
        Company company = companyRepository.findById(request.getCompanyId())
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));
        IntelligentListeningStartRequest ir = new IntelligentListeningStartRequest();
        ir.setLeadId(request.getLeadId());
        ir.setTitle(request.getTitle());
        IntelligentListeningSessionResponse created = intelligentListeningService.startSession(company, ir);
        Meeting m = meetingRepository.findById(created.getId())
                .orElseThrow(() -> new RuntimeException("Sessão não encontrada após criação"));
        return toAdminEscuta(m);
    }

    @Transactional
    public AdminEscutaSessionResponse analyzeAdminEscuta(UUID sessionId) {
        Meeting m = loadEscutaMeeting(sessionId);
        intelligentListeningService.analyze(companyForEscuta(m), sessionId);
        return toAdminEscuta(meetingRepository.findById(sessionId).orElseThrow());
    }

    @Transactional
    public AdminEscutaSessionResponse completeAdminEscuta(UUID sessionId) {
        Meeting m = loadEscutaMeeting(sessionId);
        intelligentListeningService.completeToCrm(companyForEscuta(m), sessionId);
        return toAdminEscuta(meetingRepository.findById(sessionId).orElseThrow());
    }

    @Transactional
    public void deleteAdminEscuta(UUID sessionId) {
        Meeting m = loadEscutaMeeting(sessionId);
        intelligentListeningService.deleteSession(companyForEscuta(m), sessionId);
    }

    @Transactional
    public AdminEscutaSessionResponse uploadAdminEscutaAudio(UUID sessionId, MultipartFile file) {
        Meeting m = loadEscutaMeeting(sessionId);
        intelligentListeningService.uploadAndTranscribe(companyForEscuta(m), sessionId, file);
        return toAdminEscuta(meetingRepository.findById(sessionId).orElseThrow());
    }

    private Meeting loadEscutaMeeting(UUID id) {
        Meeting m = meetingRepository.findById(id).orElseThrow(() -> new RuntimeException("Sessão não encontrada"));
        if (m.getMeetingKind() != MeetingKind.INTELLIGENT_LISTENING) {
            throw new RuntimeException("Esta sessão não é Escuta Inteligente");
        }
        return m;
    }

    private Company companyForEscuta(Meeting m) {
        if (m.getCompany() == null) {
            throw new RuntimeException("Sessão sem empresa");
        }
        return m.getCompany();
    }

    private AdminEscutaSessionResponse toAdminEscuta(Meeting m) {
        IntelligentListeningSessionResponse r = intelligentListeningService.toResponse(m);
        UUID companyId = m.getCompany() != null ? m.getCompany().getId() : null;
        String companyName = m.getCompany() != null ? m.getCompany().getName() : "—";
        return AdminEscutaSessionResponse.builder()
                .companyId(companyId)
                .companyName(companyName)
                .id(r.getId())
                .leadId(r.getLeadId())
                .leadName(r.getLeadName())
                .title(r.getTitle())
                .meetingDate(r.getMeetingDate())
                .meetingTime(r.getMeetingTime())
                .status(r.getStatus())
                .statusLabel(r.getStatusLabel())
                .createdAt(r.getCreatedAt())
                .transcriptionFull(r.getTranscriptionFull())
                .aiSummary(r.getAiSummary())
                .negotiatedValueBrl(r.getNegotiatedValueBrl())
                .build();
    }

    // ========== META ADS (ADMIN GLOBAL) ==========

    public List<AdminMetaAdsCompanyResponse> getAdminMetaAdsCompanies() {
        List<Company> companies = companyRepository.findAll();
        List<AdminMetaAdsCompanyResponse> rows = new ArrayList<>();
        for (Company c : companies) {
            Optional<MetaConnection> mcOpt = metaConnectionRepository.findByCompany(c);
            long campCount = metaCampaignRepository.countByCompanyId(c.getId());
            if (mcOpt.isEmpty()) {
                rows.add(AdminMetaAdsCompanyResponse.builder()
                        .companyId(c.getId())
                        .companyName(c.getName())
                        .connected(false)
                        .adAccountId(null)
                        .accountName(null)
                        .pageId(null)
                        .instagramBusinessId(null)
                        .campaignCount(campCount)
                        .build());
            } else {
                MetaConnection mc = mcOpt.get();
                rows.add(AdminMetaAdsCompanyResponse.builder()
                        .companyId(c.getId())
                        .companyName(c.getName())
                        .connected(mc.isConnected())
                        .adAccountId(mc.getAdAccountId())
                        .accountName(mc.getAccountName())
                        .pageId(mc.getPageId())
                        .instagramBusinessId(mc.getInstagramBusinessId())
                        .campaignCount(campCount)
                        .build());
            }
        }
        rows.sort(Comparator.comparing(AdminMetaAdsCompanyResponse::getCompanyName, String.CASE_INSENSITIVE_ORDER));
        return rows;
    }

    public CampaignsListResponse getAdminMetaAdsCampaigns(UUID companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));
        return marketingService.getCampaignsForCompany(company);
    }

    @Transactional
    public void syncAdminMetaAdsForCompany(UUID companyId) {
        metaSyncService.syncForCompany(companyId);
    }

    // ========== METAS E OBJETIVOS (ADMIN GLOBAL) ==========

    public List<AdminGoalCompanyRowResponse> getAdminGoalCompanyRows(Integer year) {
        int y = year != null ? year : LocalDate.now().getYear();
        List<Company> companies = companyRepository.findAll();
        List<AdminGoalCompanyRowResponse> rows = new ArrayList<>();
        for (Company c : companies) {
            long count = goalRepository.findByCompanyAndYearCycleAndStatusOrderByCreatedAtDesc(c, y, GoalStatus.ACTIVE)
                    .size();
            rows.add(AdminGoalCompanyRowResponse.builder()
                    .companyId(c.getId())
                    .companyName(c.getName())
                    .year(y)
                    .activeGoalsCount(count)
                    .build());
        }
        rows.sort(Comparator.comparing(AdminGoalCompanyRowResponse::getCompanyName, String.CASE_INSENSITIVE_ORDER));
        return rows;
    }

    public AdminGoalsForCompanyResponse getAdminGoalsForCompany(UUID companyId, Integer year, Integer planningMonth) {
        Company c = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));
        int y = year != null ? year : LocalDate.now().getYear();
        List<DashboardResponse.GoalDTO> goals = dashboardService.getGoalsForCompany(c, year, planningMonth);
        return AdminGoalsForCompanyResponse.builder()
                .companyId(c.getId())
                .companyName(c.getName())
                .year(y)
                .goals(goals)
                .build();
    }

    // ========== AGENDA COMERCIAL (ADMIN GLOBAL) ==========

    private static final Map<MeetingStatus, String> MEETING_STATUS_LABELS = Map.of(
            MeetingStatus.SCHEDULED, "Agendada",
            MeetingStatus.CONFIRMED, "Confirmada",
            MeetingStatus.COMPLETED, "Realizada",
            MeetingStatus.NO_SHOW, "Não compareceu",
            MeetingStatus.CANCELLED, "Cancelada",
            MeetingStatus.RESCHEDULED, "Reagendada");

    public List<AdminMeetingRowResponse> getAdminAgenda(LocalDate start, LocalDate end, UUID companyId, String q) {
        if (start == null || end == null) {
            throw new RuntimeException("Informe data inicial e final");
        }
        String qf = (q != null && !q.trim().isEmpty()) ? q.trim() : null;
        List<Meeting> meetings;
        if (qf == null) {
            meetings = meetingRepository.searchAdminAgendaWithoutText(start, end, companyId);
        } else {
            List<UUID> ids = meetingRepository.searchAdminAgendaIdsWithText(start, end, companyId, qf);
            if (ids.isEmpty()) {
                meetings = Collections.emptyList();
            } else {
                List<Meeting> fetched = meetingRepository.findByIdsWithFetch(ids);
                Map<UUID, Meeting> byId = fetched.stream()
                        .collect(Collectors.toMap(Meeting::getId, m -> m, (a, b) -> a));
                meetings = ids.stream().map(byId::get).filter(Objects::nonNull).toList();
            }
        }
        return meetings.stream().map(this::toAdminMeetingRow).collect(Collectors.toList());
    }

    /**
     * Agenda admin paginada — mesmos filtros de {@link #getAdminAgenda(LocalDate, LocalDate, UUID, String)}.
     */
    public Page<AdminMeetingRowResponse> getAdminAgendaPage(
            LocalDate start, LocalDate end, UUID companyId, String q, int page, int size) {
        if (start == null || end == null) {
            throw new RuntimeException("Informe data inicial e final");
        }
        String qf = (q != null && !q.trim().isEmpty()) ? q.trim() : null;
        Pageable pageable =
                PageRequest.of(page, size, Sort.by(Sort.Order.asc("meetingDate"), Sort.Order.asc("meetingTime")));
        if (qf == null) {
            return meetingRepository.searchAdminAgendaWithoutTextPage(start, end, companyId, pageable)
                    .map(this::toAdminMeetingRow);
        }
        Page<UUID> idPage = meetingRepository.searchAdminAgendaIdsWithTextPage(start, end, companyId, qf, pageable);
        List<UUID> ids = idPage.getContent();
        if (ids.isEmpty()) {
            return new PageImpl<>(Collections.emptyList(), idPage.getPageable(), idPage.getTotalElements());
        }
        List<Meeting> fetched = meetingRepository.findByIdsWithFetch(ids);
        Map<UUID, Meeting> byId =
                fetched.stream().collect(Collectors.toMap(Meeting::getId, m -> m, (a, b) -> a));
        List<AdminMeetingRowResponse> content = ids.stream()
                .map(byId::get)
                .filter(Objects::nonNull)
                .map(this::toAdminMeetingRow)
                .toList();
        return new PageImpl<>(content, idPage.getPageable(), idPage.getTotalElements());
    }

    private AdminMeetingRowResponse toAdminMeetingRow(Meeting m) {
        MeetingStatus st = m.getStatus() != null ? m.getStatus() : MeetingStatus.SCHEDULED;
        MeetingKind k = m.getMeetingKind() != null ? m.getMeetingKind() : MeetingKind.STANDARD;
        String leadName = m.getLead() != null ? m.getLead().getName() : null;
        return AdminMeetingRowResponse.builder()
                .id(m.getId())
                .companyId(m.getCompany().getId())
                .companyName(m.getCompany().getName())
                .leadId(m.getLead() != null ? m.getLead().getId() : null)
                .leadName(leadName)
                .title(m.getTitle())
                .contactName(m.getContactName())
                .contactEmail(m.getContactEmail())
                .contactPhone(m.getContactPhone())
                .meetingDate(m.getMeetingDate())
                .meetingTime(m.getMeetingTime())
                .durationMinutes(m.getDurationMinutes())
                .status(st.name())
                .statusLabel(MEETING_STATUS_LABELS.getOrDefault(st, st.name()))
                .meetingKind(k.name())
                .meetingLink(m.getMeetingLink())
                .googleEventId(m.getGoogleEventId())
                .scheduledBy(m.getScheduledBy())
                .notes(m.getNotes())
                .build();
    }

    @Transactional
    public MeetingResponse createAdminMeeting(AdminMeetingCreateRequest req) {
        Company company = companyRepository.findById(req.getCompanyId())
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));
        MeetingRequest mr = new MeetingRequest();
        mr.setTitle(req.getTitle());
        mr.setContactName(req.getContactName());
        mr.setContactEmail(req.getContactEmail());
        mr.setContactPhone(req.getContactPhone());
        mr.setMeetingDate(req.getMeetingDate());
        mr.setMeetingTime(req.getMeetingTime());
        mr.setDurationMinutes(req.getDurationMinutes() != null ? req.getDurationMinutes() : 30);
        mr.setNotes(req.getNotes());
        mr.setMeetingLink(req.getMeetingLink());
        mr.setLeadId(req.getLeadId());
        mr.setMeetingKind(req.getMeetingKind() != null ? req.getMeetingKind() : MeetingKind.STANDARD);
        mr.setScheduledBy("Admin");
        mr.setStatus(MeetingStatus.SCHEDULED);
        return meetingService.createMeeting(company, mr);
    }

    @Transactional
    public MeetingResponse patchAdminMeetingStatus(UUID meetingId, MeetingStatus status) {
        return meetingService.updateMeetingStatusAsAdmin(meetingId, status);
    }

    @Transactional
    public void deleteAdminMeeting(UUID meetingId) {
        meetingService.deleteMeetingAsAdmin(meetingId);
    }

    private static final Map<LeadStatus, String> LEAD_STATUS_LABELS = new HashMap<>();

    static {
        LEAD_STATUS_LABELS.put(LeadStatus.NEW, "Novos Leads");
        LEAD_STATUS_LABELS.put(LeadStatus.CONTACTED, "Em Contato");
        LEAD_STATUS_LABELS.put(LeadStatus.QUALIFIED, "Qualificados");
        LEAD_STATUS_LABELS.put(LeadStatus.MEETING_SCHEDULED, "Reunião");
        LEAD_STATUS_LABELS.put(LeadStatus.PROPOSAL_SENT, "Proposta");
        LEAD_STATUS_LABELS.put(LeadStatus.NEGOTIATION, "Negociação");
        LEAD_STATUS_LABELS.put(LeadStatus.WON, "Ganhos");
        LEAD_STATUS_LABELS.put(LeadStatus.LOST, "Perdidos");
    }

    /**
     * Lista leads de todas as empresas (paginado).
     */
    public Page<AdminLeadResponse> getAdminLeads(int page, int size, String status, String q) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Lead> leads;
        if (q != null && !q.trim().isEmpty()) {
            leads = leadRepository.searchAllLeads(q.trim(), pageable);
        } else if (status != null && !status.trim().isEmpty()) {
            LeadStatus st = LeadStatus.valueOf(status.trim().toUpperCase());
            leads = leadRepository.findByStatusOrderByCreatedAtDesc(st, pageable);
        } else {
            leads = leadRepository.findAll(pageable);
        }
        return leads.map(this::toAdminLeadResponse);
    }

    @Transactional
    public AdminLeadResponse patchAdminLeadStatus(UUID leadId, LeadStatus newStatus) {
        Lead lead = leadRepository.findById(leadId)
                .orElseThrow(() -> new RuntimeException("Lead não encontrado"));
        if (!newStatus.equals(lead.getStatus())) {
            lead.setManuallyQualified(true);
        }
        lead.setStatus(newStatus);
        leadRepository.save(lead);
        return toAdminLeadResponse(lead);
    }

    /**
     * Conversas WhatsApp em todas as empresas (ou filtradas por empresa).
     */
    public Page<AdminConversationSummaryResponse> getAdminConversations(int page, int size, UUID companyId) {
        Pageable pageable = PageRequest.of(page, size);
        Page<WhatsAppConversation> convs;
        if (companyId != null) {
            Company c = companyRepository.findById(companyId)
                    .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));
            convs = conversationRepository.findByCompanyOrderByLastMessageTimestampDesc(c, pageable);
        } else {
            convs = conversationRepository.findAllOrderByLastMessageDesc(pageable);
        }
        return convs.map(this::toAdminConversationSummary);
    }

    public List<WhatsAppMessageResponse> getAdminConversationMessages(UUID conversationId, int page, int limit) {
        return whatsAppChatService.getMessagesByConversation(conversationId, page, limit);
    }

    /**
     * Zera não lidas ao abrir a conversa no painel admin (global).
     * Reutiliza a mesma regra de {@link WhatsAppChatService#markConversationAsRead(UUID)}.
     */
    @Transactional
    public void markAdminAtendimentoConversationRead(UUID conversationId) {
        whatsAppChatService.markConversationAsRead(conversationId);
    }

    private AdminLeadResponse toAdminLeadResponse(Lead lead) {
        UUID cid = null;
        String cname = "—";
        if (lead.getCompany() != null) {
            cid = lead.getCompany().getId();
            cname = lead.getCompany().getName();
        }
        return AdminLeadResponse.builder()
                .id(lead.getId())
                .companyId(cid)
                .companyName(cname)
                .name(lead.getName())
                .email(lead.getEmail())
                .phone(lead.getPhone())
                .status(lead.getStatus().name())
                .statusLabel(LEAD_STATUS_LABELS.getOrDefault(lead.getStatus(), lead.getStatus().name()))
                .ownerName(lead.getOwnerName())
                .notes(lead.getNotes())
                .source(lead.getSource())
                .estimatedValue(lead.getEstimatedValue())
                .leadScore(lead.getLeadScore() != null ? lead.getLeadScore() : 0)
                .profilePictureUrl(lead.getProfilePictureUrl())
                .aiSummary(lead.getAiSummary())
                .createdAt(lead.getCreatedAt())
                .updatedAt(lead.getUpdatedAt())
                .build();
    }

    private AdminConversationSummaryResponse toAdminConversationSummary(WhatsAppConversation c) {
        UUID companyId = c.getCompany() != null ? c.getCompany().getId() : null;
        String companyName = c.getCompany() != null ? c.getCompany().getName() : "—";
        UUID leadId = c.getLead() != null ? c.getLead().getId() : null;
        String leadName = c.getLead() != null ? c.getLead().getName() : null;
        return AdminConversationSummaryResponse.builder()
                .id(c.getId())
                .companyId(companyId)
                .companyName(companyName)
                .leadId(leadId)
                .leadName(leadName)
                .phoneNumber(c.getPhoneNumber())
                .contactName(c.getContactName())
                .lastMessageText(c.getLastMessageText())
                .lastMessageTimestamp(c.getLastMessageTimestamp())
                .unreadCount(c.getUnreadCount() != null ? c.getUnreadCount() : 0)
                .profilePictureUrl(c.getProfilePictureUrl())
                .uazapInstance(c.getUazapInstance())
                .build();
    }

    // ========== CRUD DE USUÁRIOS ==========

    /**
     * Lista todos os usuários do sistema
     */
    public List<AdminUserResponse> getAllUsers() {
        List<User> users = userRepository.findAllWithCompany();

        return users.stream()
                .map(this::mapToAdminUserResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lista usuários com paginação e busca por nome, e-mail ou empresa (admin).
     */
    public Page<AdminUserResponse> getAdminUsersPage(int page, int size, String q) {
        String qq = q != null ? q.trim() : "";
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return userRepository.findAdminUsersPage(qq, pageable).map(this::mapToAdminUserResponse);
    }

    /**
     * Busca um usuário por ID
     */
    public AdminUserResponse getUserById(UUID userId) {
        User user = userRepository.findByIdWithCompany(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        return mapToAdminUserResponse(user);
    }

    /**
     * Cria um novo usuário
     */
    @Transactional
    public AdminUserResponse createUser(AdminCreateUserRequest request) {
        // Verificar se email já existe
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email já está em uso");
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .role(parseRole(request.getRole()))
                .phone(request.getPhone())
                .isActive(true)
                .emailVerified(true) // Admin pode criar verificado
                .mustChangePassword(true) // Força alteração no primeiro login
                .build();

        // Gerar senha aleatória de 8 caracteres
        String tempPassword = generateRandomPassword();
        user.setPassword(passwordEncoder.encode(tempPassword));

        // Associar empresa se fornecida
        if (request.getCompanyId() != null && !request.getCompanyId().isEmpty()) {
            Company company = companyRepository.findById(UUID.fromString(request.getCompanyId()))
                    .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));
            user.setCompany(company);
        }

        User savedUser = userRepository.save(user);
        log.info("Usuário criado pelo admin: {}", savedUser.getEmail());

        AdminUserResponse response = mapToAdminUserResponse(savedUser);
        response.setTempPassword(tempPassword); // Retorna a senha temporária APENAS na criação

        return response;
    }

    /**
     * Atualiza um usuário existente
     */
    @Transactional
    public AdminUserResponse updateUser(UUID userId, AdminUpdateUserRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        // Verificar se email já existe (se está alterando)
        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.findByEmail(request.getEmail()).isPresent()) {
                throw new RuntimeException("Email já está em uso");
            }
            user.setEmail(request.getEmail());
        }

        if (request.getName() != null) {
            user.setName(request.getName());
        }

        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        if (request.getRole() != null) {
            user.setRole(parseRole(request.getRole()));
        }

        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }

        if (request.getIsActive() != null) {
            user.setIsActive(request.getIsActive());
        }

        // Associar/dessociar empresa
        if (request.getCompanyId() != null) {
            if (request.getCompanyId().isEmpty()) {
                user.setCompany(null);
            } else {
                Company company = companyRepository.findById(UUID.fromString(request.getCompanyId()))
                        .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));
                user.setCompany(company);
            }
        }

        User savedUser = userRepository.save(user);
        log.info("Usuário atualizado pelo admin: {}", savedUser.getEmail());

        return mapToAdminUserResponse(savedUser);
    }

    /**
     * Ativa/desativa um usuário
     */
    @Transactional
    public void toggleUserStatus(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        user.setIsActive(!user.getIsActive());
        userRepository.save(user);

        log.info("Status do usuário {} alterado para {}", userId, user.getIsActive());
    }

    /**
     * Exclui um usuário (soft delete - desativa)
     */
    @Transactional
    public void deleteUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        // Soft delete - apenas desativa
        user.setIsActive(false);
        userRepository.save(user);

        log.info("Usuário {} marcado como excluído", userId);
    }

    /**
     * Exclui um usuário permanentemente
     */
    @Transactional
    public void hardDeleteUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        // Cascade delete dependências do usuário
        refreshTokenRepository.deleteByUser(user);
        notificationRepository.deleteByUser(user);

        // Limpar referências em conexões WhatsApp
        connectionRepository.findByCreatedById(userId).forEach(conn -> {
            conn.setCreatedBy(null);
            connectionRepository.save(conn);
        });

        userRepository.delete(user);
        log.info("Usuário {} excluído permanentemente", userId);
    }

    /**
     * Reseta a senha do usuário (Admin)
     * Gera uma nova senha aleatória e retorna para o admin informar ao usuário
     */
    @Transactional
    public AdminUserResponse resetUserPassword(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        String tempPassword = generateRandomPassword();
        user.setPassword(passwordEncoder.encode(tempPassword));
        user.setMustChangePassword(true);

        User savedUser = userRepository.save(user);
        log.info("Senha do usuário {} resetada pelo admin", userId);

        AdminUserResponse response = mapToAdminUserResponse(savedUser);
        response.setTempPassword(tempPassword);

        return response;
    }

    // ========== EMPRESAS ==========

    /**
     * Lista todas as empresas do sistema
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAllCompanies() {
        return companyRepository.findAll().stream()
                .map(company -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", company.getId().toString());
                    map.put("name", company.getName());
                    map.put("defaultSupportMode", company.getDefaultSupportMode());
                    map.put("createdAt", company.getCreatedAt() != null ? company.getCreatedAt().toString() : null);
                    // Campos de contrato para termos de uso
                    map.put("contratante", company.getContratante());
                    map.put("documento", company.getDocumento());
                    map.put("emailContratante", company.getEmailContratante());
                    // Plano associado
                    map.put("planId",
                            company.getPlanEntity() != null ? company.getPlanEntity().getId().toString() : null);
                    map.put("planName",
                            company.getPlanEntity() != null ? company.getPlanEntity().getDisplayName() : null);
                    // Asaas Integration
                    map.put("asaasCustomerId", company.getAsaasCustomerId());
                    map.put("asaasSubscriptionId", company.getAsaasSubscriptionId());
                    map.put("subscriptionStatus", company.getSubscriptionStatus());
                    map.put("subscriptionDueDate",
                            company.getSubscriptionDueDate() != null ? company.getSubscriptionDueDate().toString() : null);
                    map.put("subscriptionStartDate",
                            company.getSubscriptionStartDate() != null ? company.getSubscriptionStartDate().toString() : null);
                    map.put("subscriptionEndDate",
                            company.getSubscriptionEndDate() != null ? company.getSubscriptionEndDate().toString() : null);
                    return map;
                })
                .collect(Collectors.toList());
    }

    /**
     * Busca uma empresa por ID
     */
    public Company getCompanyById(UUID companyId) {
        return companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));
    }

    /**
     * Lista todos os planos ativos
     */
    public List<com.backend.winai.entity.Plan> getAllPlans() {
        return planRepository.findAll().stream()
                .filter(plan -> Boolean.TRUE.equals(plan.getActive()))
                .collect(Collectors.toList());
    }

    /**
     * Cria uma nova empresa a partir do DTO
     */
    @Transactional
    public Company createCompanyFromRequest(com.backend.winai.dto.request.CreateCompanyRequest request) {
        Company company = com.backend.winai.entity.Company.builder()
                .name(request.getName())
                .contratante(request.getContratante())
                .documento(request.getDocumento())
                .emailContratante(request.getEmailContratante())
                .plan(com.backend.winai.entity.UserPlan.STARTER) // Garante plano padrão
                .status(com.backend.winai.entity.AccountStatus.ACTIVE)
                .subscriptionStatus("PENDING")
                .subscriptionStartDate(java.time.LocalDate.now())
                .subscriptionEndDate(java.time.LocalDate.now().plusDays(30))
                .build();

        Company savedCompany = companyRepository.save(company);
        log.info("Empresa criada: {}", savedCompany.getName());
        return savedCompany;
    }

    /**
     * Cria uma nova empresa (método antigo, mantido para compatibilidade)
     */
    @Transactional
    public Company createCompany(Company company) {
        // Garantir que o plano seja definido (campo NOT NULL no banco)
        company.setPlan(com.backend.winai.entity.UserPlan.STARTER);
        
        // Definir valores padrão se não fornecidos
        if (company.getStatus() == null) {
            company.setStatus(com.backend.winai.entity.AccountStatus.ACTIVE);
        }

        Company savedCompany = companyRepository.save(company);
        log.info("Empresa criada: {}", savedCompany.getName());
        return savedCompany;
    }

    /**
     * Atualiza uma empresa existente
     */
    @Transactional
    public Company updateCompany(UUID companyId, Company companyDetails) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));

        if (companyDetails.getName() != null) {
            company.setName(companyDetails.getName());
        }
        if (companyDetails.getSegment() != null) {
            company.setSegment(companyDetails.getSegment());
        }
        if (companyDetails.getPlan() != null) {
            company.setPlan(companyDetails.getPlan());
        }
        if (companyDetails.getStatus() != null) {
            company.setStatus(companyDetails.getStatus());
        }
        if (companyDetails.getWhatsapp() != null) {
            company.setWhatsapp(companyDetails.getWhatsapp());
        }
        if (companyDetails.getLeadVolume() != null) {
            company.setLeadVolume(companyDetails.getLeadVolume());
        }
        if (companyDetails.getDefaultSupportMode() != null) {
            String m = companyDetails.getDefaultSupportMode();
            if (m != null && "IA".equalsIgnoreCase(m.trim())) {
                companyAiPolicy.assertMaySetDefaultSupportModeToIA(company.getId());
            }
            company.setDefaultSupportMode(m);
        }
        // Campos de contrato para termos de uso
        if (companyDetails.getContratante() != null) {
            company.setContratante(companyDetails.getContratante());
        }
        if (companyDetails.getDocumento() != null) {
            company.setDocumento(companyDetails.getDocumento());
        }
        if (companyDetails.getEmailContratante() != null) {
            company.setEmailContratante(companyDetails.getEmailContratante());
        }
        // Plano associado
        if (companyDetails.getPlanEntity() != null) {
            company.setPlanEntity(companyDetails.getPlanEntity());
        }

        Company savedCompany = companyRepository.save(company);
        log.info("Empresa atualizada: {}", savedCompany.getName());
        return savedCompany;
    }

    /**
     * Atualiza uma empresa existente a partir de um Map (para receber planId como
     * string)
     */
    @Transactional
    public Company updateCompanyFromMap(UUID companyId, java.util.Map<String, Object> details) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));

        if (details.get("name") != null) {
            company.setName((String) details.get("name"));
        }
        if (details.get("contratante") != null) {
            company.setContratante((String) details.get("contratante"));
        }
        if (details.get("documento") != null) {
            company.setDocumento((String) details.get("documento"));
        }
        if (details.get("emailContratante") != null) {
            company.setEmailContratante((String) details.get("emailContratante"));
        }
        if (details.containsKey("defaultSupportMode")) {
            Object raw = details.get("defaultSupportMode");
            String mode = raw == null ? null : String.valueOf(raw).trim();
            if (mode != null && mode.isEmpty()) {
                mode = null;
            }
            if (mode != null && "IA".equalsIgnoreCase(mode)) {
                companyAiPolicy.assertMaySetDefaultSupportModeToIA(company.getId());
            }
            company.setDefaultSupportMode(mode);
        }

        // Processar planId - buscar o Plan pelo ID
        boolean planChanged = false;
        UUID newPlanId = null;
        boolean hadActiveSubscription = company.getAsaasSubscriptionId() != null
                && !company.getAsaasSubscriptionId().isBlank();

        if (details.get("planId") != null) {
            String planIdStr = (String) details.get("planId");
            if (planIdStr != null && !planIdStr.isEmpty()) {
                newPlanId = UUID.fromString(planIdStr);
                var planOpt = planRepository.findById(newPlanId);
                if (planOpt.isPresent()) {
                    var plan = planOpt.get();
                    planChanged = company.getPlanEntity() == null
                            || !company.getPlanEntity().getId().equals(plan.getId());
                    company.setPlanEntity(plan);
                    company.setPlan(com.backend.winai.entity.UserPlan.valueOf(plan.getName()));
                }
            }
        }

        // Processar datas de vigência
        if (details.get("subscriptionStartDate") != null) {
            String startStr = (String) details.get("subscriptionStartDate");
            if (startStr != null && !startStr.isEmpty()) {
                company.setSubscriptionStartDate(java.time.LocalDate.parse(startStr));
            }
        }
        if (details.get("subscriptionEndDate") != null) {
            String endStr = (String) details.get("subscriptionEndDate");
            if (endStr != null && !endStr.isEmpty()) {
                company.setSubscriptionEndDate(java.time.LocalDate.parse(endStr));
            }
        }
        // Permite alterar status manualmente (ex: CANCELLED -> ACTIVE ao estender vigência)
        if (details.get("subscriptionStatus") != null) {
            String statusStr = (String) details.get("subscriptionStatus");
            if (statusStr != null && !statusStr.isEmpty()) {
                company.setSubscriptionStatus(statusStr);
            }
        }

        Company savedCompany = companyRepository.save(company);
        log.info("Empresa atualizada via Map: {}", savedCompany.getName());

        // Garantir datas de vigência padrão se não existirem
        if (savedCompany.getSubscriptionStartDate() == null) {
            savedCompany.setSubscriptionStartDate(java.time.LocalDate.now());
        }
        if (savedCompany.getSubscriptionEndDate() == null) {
            savedCompany.setSubscriptionEndDate(java.time.LocalDate.now().plusDays(30));
        }
        if (savedCompany.getSubscriptionStatus() == null) {
            savedCompany.setSubscriptionStatus("PENDING");
        }
        companyRepository.save(savedCompany);

        return savedCompany;
    }

    /**
     * Exclui uma empresa
     */
    @Transactional
    public void deleteCompany(UUID companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));

        log.info("Iniciando exclusão em cascata da empresa: {} ({})", company.getName(), companyId);

        // 1. WhatsApp e Mensagens (FollowUpStatus tem FK para conversation - deletar antes)
        List<WhatsAppConversation> conversations = conversationRepository.findByCompany(company);
        for (WhatsAppConversation conv : conversations) {
            followUpStatusRepository.findByConversationId(conv.getId()).ifPresent(followUpStatusRepository::delete);
            messageRepository.deleteAll(messageRepository.findByConversationOrderByMessageTimestampAsc(conv));
        }
        conversationRepository.deleteAll(conversations);

        // 2. Conexões e IA
        List<UserWhatsAppConnection> connections = connectionRepository.findByCompanyId(companyId);
        for (UserWhatsAppConnection conn : connections) {
            knowledgeBaseConnectionRepository.deleteByConnection(conn);
        }
        connectionRepository.deleteAll(connections);

        List<KnowledgeBase> kbs = knowledgeBaseRepository.findByCompanyIdOrderByUpdatedAtDesc(company.getId());
        for (KnowledgeBase kb : kbs) {
            knowledgeBaseChunkRepository.deleteByKnowledgeBase(kb);
        }
        knowledgeBaseRepository.deleteAll(kbs);

        // 3. Leads e Insights
        leadRepository.deleteAll(leadRepository.findByCompanyOrderByCreatedAtDesc(company));
        aiInsightRepository.deleteByCompany(company);
        dashboardMetricsRepository.deleteByCompany(company);
        instagramMetricRepository.deleteByCompany(company);

        metaInsightRepository.deleteByCompany(company);
        metaAdRepository.deleteByCompany(company);
        metaAdSetRepository.deleteByCompany(company);
        metaCampaignRepository.deleteByCompany(company);

        // 4. Integrações Sociais e Outros
        socialMediaProfileRepository.findByCompany(company).ifPresent(socialMediaProfileRepository::delete);
        socialGrowthChatRepository.deleteByCompany(company);
        metaConnectionRepository.findByCompany(company).ifPresent(metaConnectionRepository::delete);
        googleDriveConnectionRepository.findByCompany(company).ifPresent(googleDriveConnectionRepository::delete);
        trafficAdvisorChatRepository.deleteAll(trafficAdvisorChatRepository.findByCompanyOrderByCreatedAtDesc(company));

        meetingRepository.deleteByCompany(company);
        goalRepository.deleteByCompany(company);

        // 5. Configs e caches por empresa
        aiRecommendationCacheRepository.findByCompanyId(companyId).ifPresent(aiRecommendationCacheRepository::delete);
        agendamentoConfigRepository.findByCompanyId(companyId).ifPresent(agendamentoConfigRepository::delete);
        followUpConfigRepository.findByCompanyId(companyId).ifPresent(followUpConfigRepository::delete);
        globalNotificationConfigRepository.findByCompanyId(companyId).ifPresent(globalNotificationConfigRepository::delete);

        // 6. Usuários: desvincular (company=null) para manter acesso, sem deletar
        List<User> users = userRepository.findByCompanyId(companyId);
        for (User user : users) {
            user.setCompany(null);
            userRepository.save(user);
        }

        // 7. Por fim, a empresa
        companyRepository.delete(company);
        log.info("Empresa {} e todos os seus dados foram excluídos com sucesso", companyId);
    }

    // ========== INSTÂNCIAS WHATSAPP ==========

    /**
     * Lista todas as instâncias WhatsApp com estatísticas
     */
    public List<AdminInstanceResponse> getAllInstances() {
        try {
            List<UazapInstanceDTO> instances = uazapService.fetchInstances();

            return instances.stream()
                    .map(this::mapToAdminInstanceResponse)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Erro ao buscar instâncias", e);
            return List.of();
        }
    }

    /**
     * Atualiza configurações de uma instância
     */
    public void updateInstanceConfig(String instanceName, UpdateInstanceConfigRequest request) {
        String url = defaultBaseUrl.replaceAll("/$", "") + "/instance/update/" + instanceName;

        log.info("Atualizando configurações da instância: {}", instanceName);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("admintoken", adminToken);
        headers.set("apikey", adminToken);

        Map<String, Object> body = new HashMap<>();
        if (request.getWebhookUrl() != null) {
            body.put("webhook", request.getWebhookUrl());
        }
        if (request.getIntegration() != null) {
            body.put("integration", request.getIntegration());
        }
        if (request.getQrcodeEnabled() != null) {
            body.put("qrcode", request.getQrcodeEnabled());
        }
        if (request.getAdminField01() != null) {
            body.put("adminField01", request.getAdminField01());
        }
        if (request.getAdminField02() != null) {
            body.put("adminField02", request.getAdminField02());
        }

        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        try {
            restTemplate.exchange(url, HttpMethod.POST, requestEntity, String.class);
            log.info("Configurações atualizadas com sucesso: {}", instanceName);
        } catch (Exception e) {
            log.error("Erro ao atualizar configurações da instância", e);
            throw new RuntimeException("Erro ao atualizar configurações: " + e.getMessage(), e);
        }
    }

    /**
     * Cria uma nova instância WhatsApp
     */
    public Map<String, Object> createInstance(com.backend.winai.dto.request.CreateUazapInstanceRequest request) {
        return uazapService.createInstance(request);
    }

    /**
     * Exclui uma instância WhatsApp
     */
    public void deleteInstance(String instanceName) {
        uazapService.deleteInstance(instanceName);
    }

    /**
     * Conecta uma instância ao WhatsApp
     */
    public Map<String, Object> connectInstance(String instanceName) {
        Map<String, Object> result = uazapService.connectInstance(instanceName);
        uazapService.ensureInstanceWebhookConfigured(instanceName);
        return result;
    }

    /**
     * Desconecta uma instância do WhatsApp
     */
    public void disconnectInstance(String instanceName) {
        uazapService.disconnectInstance(instanceName);
    }

    /**
     * Obtém configuração do Webhook Global
     */
    public com.backend.winai.dto.uazap.GlobalWebhookDTO getGlobalWebhook() {
        return uazapService.getGlobalWebhook();
    }

    /**
     * Configura o Webhook Global e propaga para todas as instâncias em cascata
     */
    public void setGlobalWebhook(com.backend.winai.dto.uazap.GlobalWebhookDTO request) {
        uazapService.setGlobalWebhookCascade(request);
    }

    /**
     * Atualiza campos administrativos de uma instância
     */
    public void updateAdminFields(String instanceId, com.backend.winai.dto.request.UpdateAdminFieldsRequest request) {
        uazapService.updateAdminFields(instanceId, request);
    }

    // ========== MÉTODOS AUXILIARES ==========

    private UserRole parseRole(String role) {
        if (role == null || role.isEmpty()) {
            return UserRole.USER;
        }
        try {
            return UserRole.valueOf(role.toUpperCase());
        } catch (Exception e) {
            return UserRole.USER;
        }
    }

    private AdminUserResponse mapToAdminUserResponse(User user) {
        return AdminUserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole() != null ? user.getRole().name() : "USER")
                .active(user.getIsActive() != null ? user.getIsActive() : true)
                .avatarUrl(user.getAvatarUrl())
                .createdAt(user.getCreatedAt())
                .lastLogin(user.getLastLogin())
                .companyName(user.getCompany() != null ? user.getCompany().getName() : null)
                .companyId(user.getCompany() != null ? user.getCompany().getId() : null)
                .mustChangePassword(user.getMustChangePassword())
                .totalMessages(0L) // TODO: Implementar contagem por usuário
                .totalConversations(0L) // TODO: Implementar contagem por usuário
                .build();
    }

    private AdminInstanceResponse mapToAdminInstanceResponse(UazapInstanceDTO instance) {
        boolean qrcodeEnabled = false;
        if (instance.getQrcode() instanceof Boolean) {
            qrcodeEnabled = (Boolean) instance.getQrcode();
        } else if (instance.getQrcode() instanceof String) {
            qrcodeEnabled = !((String) instance.getQrcode()).isEmpty();
        }

        return AdminInstanceResponse.builder()
                .instanceId(instance.getInstanceId())
                .instanceName(instance.getInstanceName())
                .status(instance.getStatus())
                .token(instance.getToken())
                // Configurações
                .webhookUrl(instance.getWebhook())
                .integration(instance.getIntegration())
                .qrcodeEnabled(qrcodeEnabled)
                // Conexão
                .connected("open".equalsIgnoreCase(instance.getStatus())
                        || "connected".equalsIgnoreCase(instance.getStatus()))
                .phoneNumber(instance.getPhoneNumber())
                .profileName(instance.getProfileName())
                .profilePicUrl(instance.getProfilePicUrl())
                // Estatísticas (ainda pendentes de implementação real)
                .totalMessages(0L)
                .totalConversations(0L)
                .build();
    }
    // ========== CONEXÕES WHATSAPP (EMPRESAS) ==========

    /**
     * Lista todas as conexões WhatsApp de empresas
     */
    public List<Map<String, Object>> getAllUserWhatsAppConnections() {
        return connectionRepository.findAllWithCompanyAndCreatedBy().stream()
                .map(conn -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", conn.getId());
                    map.put("companyId", conn.getCompany().getId());
                    map.put("companyName", conn.getCompany().getName());
                    map.put("instanceName", conn.getInstanceName());
                    map.put("isActive", conn.getIsActive());
                    map.put("createdAt", conn.getCreatedAt());
                    map.put("updatedAt", conn.getUpdatedAt());
                    if (conn.getCreatedBy() != null) {
                        map.put("createdByUserId", conn.getCreatedBy().getId());
                        map.put("createdByUserName", conn.getCreatedBy().getName());
                    }

                    // Verificar se já tem agente vinculado
                    knowledgeBaseConnectionRepository.findByConnectionIdWithKnowledgeBase(conn.getId()).ifPresent(kbConn -> {
                        map.put("agentId", kbConn.getKnowledgeBase().getId());
                        map.put("agentName", kbConn.getKnowledgeBase().getName());
                    });

                    return map;
                })
                .collect(Collectors.toList());
    }

    /**
     * Cria uma nova conexão WhatsApp para uma empresa
     */
    @Transactional
    public Map<String, Object> createUserWhatsAppConnection(CreateUserWhatsAppConnectionRequest request) {
        Company company = companyRepository.findById(request.getCompanyId())
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));

        // Verificar se já existe conexão para essa empresa e instância
        if (connectionRepository.findByCompanyIdAndInstanceName(request.getCompanyId(), request.getInstanceName())
                .isPresent()) {
            throw new RuntimeException("Esta empresa já possui uma conexão com esta instância");
        }

        UserWhatsAppConnection connection = new UserWhatsAppConnection();
        connection.setCompany(company);
        connection.setInstanceName(request.getInstanceName());
        connection.setInstanceToken(request.getInstanceToken());
        connection.setInstanceBaseUrl(request.getInstanceBaseUrl());
        connection.setDescription(request.getDescription());
        connection.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);

        if (request.getCreatedByUserId() != null) {
            userRepository.findById(request.getCreatedByUserId()).ifPresent(connection::setCreatedBy);
        }

        connection = connectionRepository.save(connection);
        UserWhatsAppConnection loaded = connectionRepository.findByIdWithCompanyAndCreatedBy(connection.getId())
                .orElse(connection);
        Map<String, Object> map = new HashMap<>();
        map.put("id", loaded.getId());
        map.put("companyId", loaded.getCompany().getId());
        map.put("companyName", loaded.getCompany().getName());
        map.put("instanceName", loaded.getInstanceName());
        map.put("isActive", loaded.getIsActive());
        map.put("createdAt", loaded.getCreatedAt());
        map.put("updatedAt", loaded.getUpdatedAt());
        if (loaded.getCreatedBy() != null) {
            map.put("createdByUserId", loaded.getCreatedBy().getId());
            map.put("createdByUserName", loaded.getCreatedBy().getName());
        }
        return map;
    }

    /**
     * Alterna o status de uma conexão
     */
    @Transactional
    public void toggleUserWhatsAppConnectionStatus(UUID connectionId) {
        UserWhatsAppConnection connection = connectionRepository.findById(connectionId)
                .orElseThrow(() -> new RuntimeException("Conexão não encontrada"));

        connection.setIsActive(!connection.getIsActive());
        connectionRepository.save(connection);
    }

    /**
     * Remove uma conexão
     */
    @Transactional
    public void deleteUserWhatsAppConnection(UUID connectionId) {
        if (!connectionRepository.existsById(connectionId)) {
            throw new RuntimeException("Conexão não encontrada");
        }
        connectionRepository.deleteById(connectionId);
    }

    private String generateRandomPassword() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
        StringBuilder sb = new StringBuilder();
        java.util.Random random = new java.util.Random();
        for (int i = 0; i < 10; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }
}
