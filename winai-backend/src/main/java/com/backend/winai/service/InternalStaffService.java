package com.backend.winai.service;

import com.backend.winai.dto.request.CreateInternalStaffRequest;
import com.backend.winai.dto.request.PatchInternalStaffRequest;
import com.backend.winai.dto.response.CreateInternalStaffResponse;
import com.backend.winai.dto.response.InternalStaffMemberDashboardResponse;
import com.backend.winai.dto.response.InternalStaffMemberResponse;
import com.backend.winai.entity.AmpliaStaffType;
import com.backend.winai.entity.LeadStatus;
import com.backend.winai.entity.User;
import com.backend.winai.entity.UserRole;
import com.backend.winai.repository.LeadRepository;
import com.backend.winai.repository.MeetingRepository;
import com.backend.winai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class InternalStaffService {

    private static final String CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz";

    private final UserRepository userRepository;
    private final LeadRepository leadRepository;
    private final MeetingRepository meetingRepository;
    private final PasswordEncoder passwordEncoder;

    public List<InternalStaffMemberResponse> listInternalStaff() {
        List<User> users = userRepository.findByAmpliaInternalStaffTrueOrderByNameAsc();
        LocalDate today = LocalDate.now(ZoneId.systemDefault());
        LocalDate startWeek = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate endWeek = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
        List<InternalStaffMemberResponse> out = new ArrayList<>();
        for (User u : users) {
            out.add(toListRow(u, startWeek, endWeek));
        }
        return out;
    }

    private InternalStaffMemberResponse toListRow(User u, LocalDate startWeek, LocalDate endWeek) {
        UUID id = u.getId();
        long total = leadRepository.countByOwnerUser_Id(id);
        long won = leadRepository.countByOwnerUser_IdAndStatus(id, LeadStatus.WON);
        long meetingsWeek = meetingRepository.countMeetingsForLeadOwnerBetween(id, startWeek, endWeek);
        int conv = total > 0 ? (int) Math.min(100, Math.round(won * 100.0 / total)) : 0;
        return InternalStaffMemberResponse.builder()
                .id(id)
                .name(u.getName())
                .email(u.getEmail())
                .ampliaStaffType(u.getAmpliaStaffType() != null ? u.getAmpliaStaffType().name() : null)
                .active(Boolean.TRUE.equals(u.getIsActive()))
                .lastLogin(u.getLastLogin())
                .leadsTotal(total)
                .leadsWon(won)
                .meetingsThisWeek(meetingsWeek)
                .conversionPercent(conv)
                .build();
    }

    @Transactional
    public CreateInternalStaffResponse create(CreateInternalStaffRequest request) {
        if (userRepository.findByEmail(request.getEmail().trim()).isPresent()) {
            throw new RuntimeException("Email já está em uso");
        }
        AmpliaStaffType type = parseStaffType(request.getAmpliaStaffType());
        String plainPassword = request.getPassword() != null && !request.getPassword().isBlank()
                ? request.getPassword()
                : generateRandomPassword();

        User user = User.builder()
                .name(request.getName().trim())
                .email(request.getEmail().trim().toLowerCase())
                .password(passwordEncoder.encode(plainPassword))
                .role(UserRole.USER)
                .company(null)
                .ampliaInternalStaff(true)
                .ampliaStaffType(type)
                .isActive(true)
                .emailVerified(true)
                .mustChangePassword(request.getPassword() == null || request.getPassword().isBlank())
                .build();

        user = userRepository.save(user);
        log.info("Colaborador interno criado: {} ({})", user.getEmail(), type);

        return CreateInternalStaffResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .ampliaStaffType(type.name())
                .tempPassword(request.getPassword() == null || request.getPassword().isBlank() ? plainPassword : null)
                .build();
    }

    @Transactional
    public InternalStaffMemberResponse patch(UUID id, PatchInternalStaffRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        if (!Boolean.TRUE.equals(user.getAmpliaInternalStaff())) {
            throw new RuntimeException("Usuário não é colaborador interno");
        }
        if (request.getAmpliaStaffType() != null && !request.getAmpliaStaffType().isBlank()) {
            user.setAmpliaStaffType(parseStaffType(request.getAmpliaStaffType()));
        }
        if (request.getIsActive() != null) {
            user.setIsActive(request.getIsActive());
        }
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            user.setMustChangePassword(false);
        }
        userRepository.save(user);
        LocalDate today = LocalDate.now(ZoneId.systemDefault());
        LocalDate startWeek = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate endWeek = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
        return toListRow(user, startWeek, endWeek);
    }

    public InternalStaffMemberDashboardResponse getMemberDashboard(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        if (!Boolean.TRUE.equals(user.getAmpliaInternalStaff())) {
            throw new RuntimeException("Usuário não é colaborador interno");
        }
        LocalDate today = LocalDate.now(ZoneId.systemDefault());
        LocalDate startWeek = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate endWeek = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));

        long total = leadRepository.countByOwnerUser_Id(userId);
        long won = leadRepository.countByOwnerUser_IdAndStatus(userId, LeadStatus.WON);
        long meetingsWeek = meetingRepository.countMeetingsForLeadOwnerBetween(userId, startWeek, endWeek);
        String conv = total > 0 ? String.format(Locale.forLanguageTag("pt-BR"), "%.1f%%", won * 100.0 / total) : "0%";

        DateTimeFormatter monthFmt = DateTimeFormatter.ofPattern("MMM/yy", new Locale("pt", "BR"));
        List<InternalStaffMemberDashboardResponse.MonthlyPoint> monthly = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            LocalDate month = today.minusMonths(i).withDayOfMonth(1);
            LocalDateTime start = month.atStartOfDay();
            LocalDateTime end = month.plusMonths(1).atStartOfDay();
            String label = month.format(monthFmt);
            long v = leadRepository.countByOwnerUserAndCreatedAtRange(userId, start, end);
            monthly.add(InternalStaffMemberDashboardResponse.MonthlyPoint.builder()
                    .name(label)
                    .value(v)
                    .build());
        }

        return InternalStaffMemberDashboardResponse.builder()
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .ampliaStaffType(user.getAmpliaStaffType() != null ? user.getAmpliaStaffType().name() : null)
                .leadsTotal(total)
                .leadsWon(won)
                .meetingsThisWeek(meetingsWeek)
                .conversionRateDisplay(conv)
                .monthlyLeads(monthly)
                .build();
    }

    private static AmpliaStaffType parseStaffType(String raw) {
        try {
            return AmpliaStaffType.valueOf(raw.trim().toUpperCase());
        } catch (Exception e) {
            throw new RuntimeException("Tipo inválido. Use: VENDEDOR, CONSULTOR ou GESTOR");
        }
    }

    private static String generateRandomPassword() {
        SecureRandom r = new SecureRandom();
        StringBuilder sb = new StringBuilder(12);
        for (int i = 0; i < 12; i++) {
            sb.append(CHARSET.charAt(r.nextInt(CHARSET.length())));
        }
        return sb.toString();
    }
}
