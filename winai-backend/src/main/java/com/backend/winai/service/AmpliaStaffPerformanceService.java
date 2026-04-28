package com.backend.winai.service;

import com.backend.winai.dto.response.AdminAmpliaStaffPerformanceResponse;
import com.backend.winai.entity.AmpliaStaffType;
import com.backend.winai.entity.CompanyStrategicDiagnosis;
import com.backend.winai.entity.Lead;
import com.backend.winai.entity.LeadStatus;
import com.backend.winai.entity.User;
import com.backend.winai.repository.CompanyStrategicDiagnosisRepository;
import com.backend.winai.repository.GoalTaskRepository;
import com.backend.winai.repository.LeadRepository;
import com.backend.winai.repository.MeetingRepository;
import com.backend.winai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AmpliaStaffPerformanceService {

    private static final ZoneId TZ = ZoneId.systemDefault();

    private final UserRepository userRepository;
    private final LeadRepository leadRepository;
    private final MeetingRepository meetingRepository;
    private final CompanyStrategicDiagnosisRepository diagnosisRepository;
    private final GoalTaskRepository goalTaskRepository;
    private final StaffPortfolioService staffPortfolioService;

    public AdminAmpliaStaffPerformanceResponse getStaffPerformance(UUID staffUserId) {
        User user = userRepository.findByIdWithAmpliaStaffRole(staffUserId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        if (!Boolean.TRUE.equals(user.getAmpliaInternalStaff())) {
            throw new RuntimeException("Performance detalhada disponível apenas para colaboradores internos");
        }

        String periodLabel = buildPeriodLabel();
        AmpliaStaffType st = user.getAmpliaStaffType();

        StaffPortfolioService.PortfolioResolution portfolio = staffPortfolioService.resolve(staffUserId);
        boolean portfolioExplicit = portfolio.explicitAssignments();
        Collection<UUID> portfolioCompanyIds = portfolio.assignedCompanyIds();

        LocalDate today = LocalDate.now(TZ);
        LocalDate startWeek = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate endWeek = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));

        long leadsTotal;
        long leadsWon;
        long meetingsWeek;
        BigDecimal revBd;
        List<Lead> wonPage;

        int pbCount;
        int companiesPb;
        long tasksDone;
        long tasksAll;
        Integer progressPct;
        List<CompanyStrategicDiagnosis> recentDiag;

        if (portfolioExplicit && !portfolioCompanyIds.isEmpty()) {
            leadsTotal = leadRepository.countByCompanyIdIn(portfolioCompanyIds);
            leadsWon = leadRepository.countByCompanyIdInAndStatus(portfolioCompanyIds, LeadStatus.WON);
            meetingsWeek = meetingRepository.countMeetingsForCompaniesBetween(portfolioCompanyIds, startWeek, endWeek);
            revBd = leadRepository.sumEstimatedValueByCompanyIdInAndStatus(portfolioCompanyIds, LeadStatus.WON);
            wonPage = leadRepository.findTopByCompanyIdInAndStatusWithCompany(portfolioCompanyIds, LeadStatus.WON,
                    PageRequest.of(0, 12));

            pbCount = (int) diagnosisRepository.countPublishedByCompanyIdIn(portfolioCompanyIds);
            companiesPb = (int) diagnosisRepository.countDistinctCompaniesWithPublishedPlaybookIn(portfolioCompanyIds);
            tasksDone = goalTaskRepository.countCompletedInPlaybookCompaniesIn(portfolioCompanyIds);
            tasksAll = goalTaskRepository.countAllTasksInPlaybookCompaniesIn(portfolioCompanyIds);
            progressPct = tasksAll > 0 ? (int) Math.min(100, Math.round(tasksDone * 100.0 / tasksAll)) : null;
            recentDiag = diagnosisRepository.findPublishedByCompanyIdInOrderByPublishedAtDesc(portfolioCompanyIds,
                    PageRequest.of(0, 10));
        } else {
            leadsTotal = leadRepository.countByOwnerUser_Id(staffUserId);
            leadsWon = leadRepository.countByOwnerUser_IdAndStatus(staffUserId, LeadStatus.WON);
            meetingsWeek = meetingRepository.countMeetingsForLeadOwnerBetween(staffUserId, startWeek, endWeek);
            revBd = leadRepository.sumEstimatedValueByOwnerAndStatus(staffUserId, LeadStatus.WON);
            wonPage = leadRepository.findTopByOwnerAndStatusWithCompany(
                    staffUserId, LeadStatus.WON, PageRequest.of(0, 12));

            pbCount = (int) diagnosisRepository.countByPublishedAtIsNotNullAndUpdatedByUserId(staffUserId);
            List<UUID> companyIds = diagnosisRepository.findDistinctCompanyIdsPublishedBy(staffUserId);
            companiesPb = companyIds.size();
            tasksDone = goalTaskRepository.countCompletedInPlaybookCompaniesByPublisher(staffUserId);
            tasksAll = goalTaskRepository.countAllTasksInPlaybookCompaniesByPublisher(staffUserId);
            progressPct = tasksAll > 0 ? (int) Math.min(100, Math.round(tasksDone * 100.0 / tasksAll)) : null;
            recentDiag = diagnosisRepository.findPublishedByUserOrderByPublishedAtDesc(staffUserId, PageRequest.of(0, 10));
        }

        int conv = leadsTotal > 0 ? (int) Math.min(100, Math.round(leadsWon * 100.0 / leadsTotal)) : 0;
        double revenueWon = revBd != null ? revBd.doubleValue() : 0.0;

        List<AdminAmpliaStaffPerformanceResponse.ClosedDealRow> deals = new ArrayList<>();
        for (Lead l : wonPage) {
            String cn = l.getCompany() != null ? l.getCompany().getName() : "—";
            Double val = l.getEstimatedValue() != null ? l.getEstimatedValue().doubleValue() : null;
            deals.add(AdminAmpliaStaffPerformanceResponse.ClosedDealRow.builder()
                    .leadName(l.getName())
                    .companyName(cn)
                    .valueBrl(val)
                    .statusLabel("Ganho")
                    .build());
        }

        AdminAmpliaStaffPerformanceResponse.SalesBlock salesBlock = AdminAmpliaStaffPerformanceResponse.SalesBlock.builder()
                .leadsTotal(leadsTotal)
                .leadsWon(leadsWon)
                .conversionPercent(conv)
                .meetingsThisWeek(meetingsWeek)
                .revenueWonTotal(revenueWon)
                .recentDeals(deals)
                .build();

        List<AdminAmpliaStaffPerformanceResponse.PlaybookDeliveryRow> deliveries = new ArrayList<>();
        for (CompanyStrategicDiagnosis d : recentDiag) {
            ZonedDateTime p = d.getPublishedAt();
            String iso = p != null ? p.toInstant().toString() : null;
            String cname = d.getCompany() != null ? d.getCompany().getName() : "—";
            deliveries.add(AdminAmpliaStaffPerformanceResponse.PlaybookDeliveryRow.builder()
                    .companyName(cname)
                    .publishedAt(iso)
                    .build());
        }

        AdminAmpliaStaffPerformanceResponse.ConsultantBlock consultantBlock =
                AdminAmpliaStaffPerformanceResponse.ConsultantBlock.builder()
                        .playbooksPublished(pbCount)
                        .companiesWithPlaybook(companiesPb)
                        .goalTasksCompleted(tasksDone)
                        .goalTasksTotal(tasksAll > 0 ? tasksAll : null)
                        .playbookGoalProgressPercent(progressPct)
                        .recentDeliveries(deliveries)
                        .build();

        String uiMode = resolveUiMode(st, leadsTotal, pbCount);
        String roleName = user.getAmpliaStaffRole() != null ? user.getAmpliaStaffRole().getName() : null;
        boolean salesMode = "sales".equals(uiMode);
        boolean consultantMode = "consultant".equals(uiMode);

        return AdminAmpliaStaffPerformanceResponse.builder()
                .staffUserId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .ampliaStaffType(st != null ? st.name() : null)
                .ampliaStaffRoleName(roleName)
                .uiMode(uiMode)
                .periodLabel(periodLabel)
                .sales(salesMode ? salesBlock : null)
                .consultant(consultantMode ? consultantBlock : null)
                .build();
    }

    private static String buildPeriodLabel() {
        LocalDate today = LocalDate.now(TZ);
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMMM yyyy", new Locale("pt", "BR"));
        String raw = today.format(fmt);
        if (raw.isEmpty()) {
            return "";
        }
        return raw.substring(0, 1).toUpperCase(Locale.forLanguageTag("pt-BR")) + raw.substring(1);
    }

    /**
     * Só dois modos de painel: vendas ou consultoria (sem painel combinado “gestão”).
     * GESTOR ou tipo desconhecido: prioriza consultoria se houver playbook publicado; senão vendas.
     */
    private static String resolveUiMode(AmpliaStaffType st, long leadsTotal, int playbooksPublished) {
        if (st == AmpliaStaffType.VENDEDOR) {
            return "sales";
        }
        if (st == AmpliaStaffType.CONSULTOR) {
            return "consultant";
        }
        if (st == AmpliaStaffType.GESTOR) {
            return playbooksPublished > 0 ? "consultant" : "sales";
        }
        if (st == null) {
            return playbooksPublished > 0 ? "consultant" : "sales";
        }
        return playbooksPublished > leadsTotal ? "consultant" : "sales";
    }
}
