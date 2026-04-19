package com.backend.winai.service;

import com.backend.winai.dto.consultancy.*;
import com.backend.winai.entity.*;
import com.backend.winai.repository.CompanyRepository;
import com.backend.winai.repository.ConsultancyCallRequestRepository;
import com.backend.winai.repository.MeetingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ConsultancyService {

    private static final ZoneId BRAZIL = ZoneId.of("America/Sao_Paulo");
    private static final String RECORDINGS_BUCKET = "consultancy-recordings";
    private static final DateTimeFormatter DATE_PT = DateTimeFormatter.ofPattern("d MMMM yyyy", new Locale("pt", "BR"));
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter TABLE_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter REQUEST_TS = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final MeetingRepository meetingRepository;
    private final CompanyRepository companyRepository;
    private final ConsultancyCallRequestRepository consultancyCallRequestRepository;
    private final SupabaseStorageService supabaseStorageService;
    private final OpenAiService openAiService;

    @Transactional(readOnly = true)
    public ConsultancyDashboardResponse getDashboard(User user) {
        if (user.getCompany() == null) {
            throw new IllegalStateException("Usuário sem empresa");
        }
        Company company = companyRepository.findById(user.getCompany().getId())
                .orElseThrow(() -> new IllegalStateException("Empresa não encontrada"));

        ConsultantProfileDto consultant = ConsultantProfileDto.builder()
                .displayName(blankToNull(company.getConsultantDisplayName()))
                .role(blankToNull(company.getConsultantRole()))
                .avatarUrl(blankToNull(company.getConsultantAvatarUrl()))
                .build();

        String planName = resolvePlanDisplayName(company);

        LocalDate today = LocalDate.now(BRAZIL);
        LocalTime nowTime = LocalTime.now(BRAZIL);

        List<Meeting> upcoming = meetingRepository.findUpcomingConsultancy(company, MeetingKind.CONSULTANCY, today,
                nowTime);
        ConsultancyNextMeetingDto next = upcoming.isEmpty() ? null : toNextDto(upcoming.get(0));

        List<Meeting> past = meetingRepository.findConsultancyHistory(company, MeetingKind.CONSULTANCY, today);
        List<ConsultancyHistoryRowDto> history = past.stream()
                .limit(100)
                .map(this::toHistoryRow)
                .collect(Collectors.toList());

        List<ConsultancyClientCallRequestDto> recentRequests = consultancyCallRequestRepository
                .findByCompany_IdOrderByCreatedAtDesc(company.getId(), PageRequest.of(0, 8))
                .stream()
                .map(this::toClientCallRequestDto)
                .collect(Collectors.toList());

        return ConsultancyDashboardResponse.builder()
                .consultant(consultant)
                .planDisplayName(planName)
                .pageCopy(buildPageCopyForClient(company))
                .nextMeeting(next)
                .history(history)
                .recentCallRequests(recentRequests)
                .build();
    }

    @Transactional
    public void createCallRequest(User user, CreateConsultancyCallRequestDto dto) {
        if (user.getCompany() == null) {
            throw new IllegalStateException("Usuário sem empresa");
        }
        Company company = companyRepository.findById(user.getCompany().getId())
                .orElseThrow(() -> new IllegalStateException("Empresa não encontrada"));
        ConsultancyCallRequest req = ConsultancyCallRequest.builder()
                .company(company)
                .requestedBy(user)
                .subject(dto.getSubject().trim())
                .urgency(dto.getUrgency() != null ? dto.getUrgency() : "normal")
                .topics(dto.getTopics().trim())
                .status(ConsultancyRequestStatus.PENDING)
                .build();
        consultancyCallRequestRepository.save(req);
    }

    @Transactional(readOnly = true)
    public ConsultancyMeetingDetailResponse getMeetingDetail(User user, UUID meetingId) {
        if (user.getCompany() == null) {
            throw new IllegalStateException("Usuário sem empresa");
        }
        Company company = companyRepository.findById(user.getCompany().getId()).orElseThrow();
        Meeting m = meetingRepository.findByIdAndCompany(meetingId, company)
                .orElseThrow(() -> new IllegalArgumentException("Encontro não encontrado"));
        if (m.getMeetingKind() != MeetingKind.CONSULTANCY) {
            throw new IllegalArgumentException("Encontro inválido");
        }
        return toDetail(m);
    }

    /** Admin: lista reuniões de consultoria da empresa */
    @Transactional(readOnly = true)
    public List<ConsultancyHistoryRowDto> adminListConsultancyMeetings(UUID companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Empresa não encontrada"));
        return meetingRepository
                .findByCompanyAndMeetingKindOrderByMeetingDateDescMeetingTimeDesc(company, MeetingKind.CONSULTANCY)
                .stream()
                .map(this::toHistoryRow)
                .collect(Collectors.toList());
    }

    @Transactional
    public void adminUploadRecording(UUID companyId, UUID meetingId, MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Arquivo obrigatório");
        }
        Meeting m = loadConsultancyMeeting(companyId, meetingId);
        String orig = file.getOriginalFilename() != null ? file.getOriginalFilename() : "recording.bin";
        String ext = orig.contains(".") ? orig.substring(orig.lastIndexOf('.')) : "";
        String contentType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";
        String path = companyId + "/" + meetingId + ext;
        String url = supabaseStorageService.uploadFileBytes(RECORDINGS_BUCKET, path, file.getBytes(), contentType);
        m.setRecordingUrl(url);
        meetingRepository.save(m);
    }

    @Transactional
    public ConsultancyMeetingDetailResponse adminSaveTranscriptionAndSummarize(UUID companyId, UUID meetingId,
            TranscriptionUpdateRequest body) {
        Meeting m = loadConsultancyMeeting(companyId, meetingId);
        String text = body.getText().trim();
        m.setTranscriptionFull(text);
        String summary = openAiService.summarizeConsultancyTranscription(text);
        m.setAiSummary(summary);
        if (summary != null && summary.length() > 500) {
            m.setTopicsPreview(summary.substring(0, 497) + "...");
        } else if (summary != null) {
            m.setTopicsPreview(summary);
        }
        meetingRepository.save(m);
        return toDetail(meetingRepository.findById(m.getId()).orElse(m));
    }

    @Transactional(readOnly = true)
    public ConsultancyClientAppearanceDto adminGetClientAppearance(UUID companyId) {
        Company c = companyRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Empresa não encontrada"));
        return ConsultancyClientAppearanceDto.builder()
                .consultant(ConsultantProfileDto.builder()
                        .displayName(blankToNull(c.getConsultantDisplayName()))
                        .role(blankToNull(c.getConsultantRole()))
                        .avatarUrl(blankToNull(c.getConsultantAvatarUrl()))
                        .build())
                .pageCopy(ConsultancyPageCopyDto.builder()
                        .kicker(blankToNull(c.getConsultancyClientKicker()))
                        .headlinePrefix(blankToNull(c.getConsultancyClientHeadlinePrefix()))
                        .headlineAccent(blankToNull(c.getConsultancyClientHeadlineAccent()))
                        .nextSectionCaption(blankToNull(c.getConsultancyNextSectionCaption()))
                        .requestCardTitle(blankToNull(c.getConsultancyRequestCardTitle()))
                        .requestCardDescription(blankToNull(c.getConsultancyRequestCardDescription()))
                        .build())
                .build();
    }

    @Transactional
    public ConsultancyClientAppearanceDto adminPatchClientAppearance(UUID companyId,
            ConsultancyClientAppearancePatchRequest req) {
        Company c = companyRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Empresa não encontrada"));
        if (req.getDisplayName() != null) {
            c.setConsultantDisplayName(emptyToNull(req.getDisplayName()));
        }
        if (req.getRole() != null) {
            c.setConsultantRole(emptyToNull(req.getRole()));
        }
        if (req.getAvatarUrl() != null) {
            c.setConsultantAvatarUrl(emptyToNull(req.getAvatarUrl()));
        }
        if (req.getKicker() != null) {
            c.setConsultancyClientKicker(emptyToNull(req.getKicker()));
        }
        if (req.getHeadlinePrefix() != null) {
            c.setConsultancyClientHeadlinePrefix(emptyToNull(req.getHeadlinePrefix()));
        }
        if (req.getHeadlineAccent() != null) {
            c.setConsultancyClientHeadlineAccent(emptyToNull(req.getHeadlineAccent()));
        }
        if (req.getNextSectionCaption() != null) {
            c.setConsultancyNextSectionCaption(emptyToNull(req.getNextSectionCaption()));
        }
        if (req.getRequestCardTitle() != null) {
            c.setConsultancyRequestCardTitle(emptyToNull(req.getRequestCardTitle()));
        }
        if (req.getRequestCardDescription() != null) {
            c.setConsultancyRequestCardDescription(emptyToNull(req.getRequestCardDescription()));
        }
        companyRepository.save(c);
        return adminGetClientAppearance(companyId);
    }

    @Transactional(readOnly = true)
    public List<ConsultancyCallRequestAdminRowDto> adminListAllCallRequests() {
        return consultancyCallRequestRepository.findAllForAdmin().stream()
                .map(this::toAdminCallRequestRow)
                .collect(Collectors.toList());
    }

    @Transactional
    public ConsultancyCallRequestAdminRowDto adminPatchCallRequest(UUID requestId,
            ConsultancyCallRequestPatchRequest body) {
        ConsultancyCallRequest r = consultancyCallRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Pedido não encontrado"));
        if (body.getMeetLink() != null) {
            String ml = body.getMeetLink().trim();
            r.setMeetLink(ml.isEmpty() ? null : ml);
            if (ml.isEmpty() && r.getStatus() == ConsultancyRequestStatus.SCHEDULED) {
                r.setStatus(ConsultancyRequestStatus.PENDING);
            } else if (!ml.isEmpty() && r.getStatus() == ConsultancyRequestStatus.PENDING) {
                r.setStatus(ConsultancyRequestStatus.SCHEDULED);
            }
        }
        if (body.getStatus() != null && !body.getStatus().isBlank()) {
            try {
                r.setStatus(ConsultancyRequestStatus.valueOf(body.getStatus().trim().toUpperCase()));
            } catch (IllegalArgumentException ex) {
                throw new IllegalArgumentException("Status inválido: use PENDING, SCHEDULED, DONE ou CANCELLED");
            }
        }
        consultancyCallRequestRepository.save(r);
        ConsultancyCallRequest detailed = consultancyCallRequestRepository.findDetailedById(requestId)
                .orElse(r);
        return toAdminCallRequestRow(detailed);
    }

    @Transactional
    public ConsultantProfileDto adminPatchConsultantProfile(UUID companyId, ConsultantProfilePatchRequest req) {
        Company c = companyRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Empresa não encontrada"));
        if (req.getDisplayName() != null) {
            c.setConsultantDisplayName(req.getDisplayName().trim());
        }
        if (req.getRole() != null) {
            c.setConsultantRole(req.getRole().trim());
        }
        if (req.getAvatarUrl() != null) {
            c.setConsultantAvatarUrl(req.getAvatarUrl().trim().isEmpty() ? null : req.getAvatarUrl().trim());
        }
        companyRepository.save(c);
        return ConsultantProfileDto.builder()
                .displayName(c.getConsultantDisplayName())
                .role(c.getConsultantRole())
                .avatarUrl(c.getConsultantAvatarUrl())
                .build();
    }

    private Meeting loadConsultancyMeeting(UUID companyId, UUID meetingId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new IllegalArgumentException("Empresa não encontrada"));
        Meeting m = meetingRepository.findByIdAndCompany(meetingId, company)
                .orElseThrow(() -> new IllegalArgumentException("Reunião não encontrada"));
        if (m.getMeetingKind() != MeetingKind.CONSULTANCY) {
            throw new IllegalArgumentException("Reunião não é de consultoria");
        }
        return m;
    }

    private ConsultancyNextMeetingDto toNextDto(Meeting m) {
        String statusLabel = m.getStatus() == MeetingStatus.CONFIRMED ? "Confirmado" : "Agendado";
        return ConsultancyNextMeetingDto.builder()
                .id(m.getId())
                .dateLabel(m.getMeetingDate().format(DATE_PT))
                .timeLabel(m.getMeetingTime().format(TIME_FMT))
                .typeLabel(m.getTitle() != null ? m.getTitle() : "Call de consultoria")
                .meetingLink(m.getMeetingLink())
                .statusLabel(statusLabel)
                .build();
    }

    private ConsultancyHistoryRowDto toHistoryRow(Meeting m) {
        String topics = m.getTopicsPreview();
        if (topics == null || topics.isBlank()) {
            topics = m.getNotes() != null && m.getNotes().length() > 120 ? m.getNotes().substring(0, 117) + "..."
                    : (m.getNotes() != null ? m.getNotes() : "—");
        }
        int dm = m.getDurationMinutes() != null ? m.getDurationMinutes() : 0;
        return ConsultancyHistoryRowDto.builder()
                .id(m.getId())
                .dateLabel(m.getMeetingDate().format(TABLE_DATE))
                .typeLabel(m.getTitle() != null ? m.getTitle() : "Consultoria")
                .durationLabel(dm > 0 ? dm + " min" : "—")
                .topicsLine(topics)
                .hasRecording(m.getRecordingUrl() != null && !m.getRecordingUrl().isBlank())
                .hasSummary(m.getAiSummary() != null && !m.getAiSummary().isBlank())
                .hasTranscription(m.getTranscriptionFull() != null && !m.getTranscriptionFull().isBlank())
                .build();
    }

    private ConsultancyMeetingDetailResponse toDetail(Meeting m) {
        int dm = m.getDurationMinutes() != null ? m.getDurationMinutes() : 0;
        return ConsultancyMeetingDetailResponse.builder()
                .id(m.getId())
                .title(m.getTitle())
                .dateLabel(m.getMeetingDate().format(DATE_PT))
                .timeLabel(m.getMeetingTime().format(TIME_FMT))
                .durationLabel(dm > 0 ? dm + " min" : "—")
                .typeLabel(m.getTitle() != null ? m.getTitle() : "Consultoria")
                .recordingUrl(m.getRecordingUrl())
                .aiSummary(m.getAiSummary())
                .transcriptionFull(m.getTranscriptionFull())
                .build();
    }

    private ConsultancyPageCopyDto buildPageCopyForClient(Company c) {
        return ConsultancyPageCopyDto.builder()
                .kicker(firstNonBlank(c.getConsultancyClientKicker(), "Consultoria Estratégica"))
                .headlinePrefix(firstNonBlank(c.getConsultancyClientHeadlinePrefix(), "Seu Painel de "))
                .headlineAccent(firstNonBlank(c.getConsultancyClientHeadlineAccent(), "Performance"))
                .nextSectionCaption(
                        firstNonBlank(c.getConsultancyNextSectionCaption(), "Sua próxima análise estratégica"))
                .requestCardTitle(firstNonBlank(c.getConsultancyRequestCardTitle(), "Solicitar novo encontro"))
                .requestCardDescription(firstNonBlank(c.getConsultancyRequestCardDescription(),
                        "Envie uma solicitação para a equipe de consultoria."))
                .build();
    }

    private ConsultancyClientCallRequestDto toClientCallRequestDto(ConsultancyCallRequest r) {
        return ConsultancyClientCallRequestDto.builder()
                .id(r.getId())
                .subject(r.getSubject())
                .urgency(r.getUrgency())
                .status(r.getStatus().name())
                .statusLabel(translateRequestStatus(r.getStatus()))
                .meetLink(blankToNull(r.getMeetLink()))
                .createdAtLabel(
                        r.getCreatedAt() != null ? REQUEST_TS.format(r.getCreatedAt().withZoneSameInstant(BRAZIL)) : "")
                .build();
    }

    private ConsultancyCallRequestAdminRowDto toAdminCallRequestRow(ConsultancyCallRequest r) {
        User u = r.getRequestedBy();
        return ConsultancyCallRequestAdminRowDto.builder()
                .id(r.getId())
                .companyId(r.getCompany().getId())
                .companyName(r.getCompany().getName())
                .requestedByName(u != null ? u.getName() : null)
                .requestedByEmail(u != null ? u.getEmail() : null)
                .subject(r.getSubject())
                .urgency(r.getUrgency())
                .topics(r.getTopics())
                .status(r.getStatus().name())
                .statusLabel(translateRequestStatus(r.getStatus()))
                .meetLink(blankToNull(r.getMeetLink()))
                .createdAtLabel(
                        r.getCreatedAt() != null ? REQUEST_TS.format(r.getCreatedAt().withZoneSameInstant(BRAZIL)) : "")
                .build();
    }

    private static String translateRequestStatus(ConsultancyRequestStatus s) {
        if (s == null) {
            return "";
        }
        return switch (s) {
            case PENDING -> "Aguardando agendamento";
            case SCHEDULED -> "Link disponível";
            case DONE -> "Concluído";
            case CANCELLED -> "Cancelado";
        };
    }

    private static String firstNonBlank(String v, String def) {
        return v != null && !v.isBlank() ? v.trim() : def;
    }

    private static String emptyToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private static String resolvePlanDisplayName(Company company) {
        if (company.getPlanEntity() != null && company.getPlanEntity().getDisplayName() != null) {
            return company.getPlanEntity().getDisplayName();
        }
        if (company.getPlan() != null) {
            return company.getPlan().name();
        }
        return "—";
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }
}
