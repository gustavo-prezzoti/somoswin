package com.backend.winai.service;

import com.backend.winai.dto.consultancy.*;
import com.backend.winai.entity.*;
import com.backend.winai.repository.CompanyRepository;
import com.backend.winai.repository.ConsultancyCallRequestRepository;
import com.backend.winai.repository.MeetingRepository;
import lombok.RequiredArgsConstructor;
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

        return ConsultancyDashboardResponse.builder()
                .consultant(consultant)
                .planDisplayName(planName)
                .nextMeeting(next)
                .history(history)
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
