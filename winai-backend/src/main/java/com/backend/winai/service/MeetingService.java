package com.backend.winai.service;

import com.backend.winai.dto.request.MeetingRequest;
import com.backend.winai.dto.response.CalendarResponse;
import com.backend.winai.dto.response.MeetingResponse;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.Lead;
import com.backend.winai.entity.Meeting;
import com.backend.winai.entity.MeetingStatus;
import com.backend.winai.repository.LeadRepository;
import com.backend.winai.repository.MeetingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class MeetingService {

    private final MeetingRepository meetingRepository;
    private final LeadRepository leadRepository;
    private final GoogleDriveService googleDriveService;

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private static final Map<MeetingStatus, String> STATUS_LABELS = Map.of(
            MeetingStatus.SCHEDULED, "Agendada",
            MeetingStatus.CONFIRMED, "Confirmada",
            MeetingStatus.COMPLETED, "Realizada",
            MeetingStatus.NO_SHOW, "Não Compareceu",
            MeetingStatus.CANCELLED, "Cancelada",
            MeetingStatus.RESCHEDULED, "Reagendada");

    /**
     * Obtém reuniões de um período com estatísticas
     */
    @Transactional(readOnly = true)
    public CalendarResponse getCalendarData(Company company, LocalDate startDate, LocalDate endDate) {
        List<Meeting> meetings = meetingRepository.findByCompanyAndDateRange(company, startDate, endDate);

        List<MeetingResponse> meetingResponses = meetings.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        CalendarResponse.CalendarStats stats = calculateStats(company);

        return CalendarResponse.builder()
                .meetings(meetingResponses)
                .stats(stats)
                .build();
    }

    /**
     * Lista reuniões de um dia específico
     */
    @Transactional(readOnly = true)
    public List<MeetingResponse> getMeetingsForDate(Company company, LocalDate date) {
        return meetingRepository.findByCompanyAndMeetingDateOrderByMeetingTimeAsc(company, date)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Busca reunião por ID
     */
    @Transactional(readOnly = true)
    public MeetingResponse getMeetingById(Company company, UUID id) {
        Meeting meeting = meetingRepository.findByIdAndCompany(id, company)
                .orElseThrow(() -> new RuntimeException("Reunião não encontrada"));
        return toResponse(meeting);
    }

    /**
     * Cria uma nova reunião
     */
    @Transactional
    public MeetingResponse createMeeting(Company company, MeetingRequest request) {
        Lead lead = null;
        if (request.getLeadId() != null) {
            lead = leadRepository.findByIdAndCompany(request.getLeadId(), company).orElse(null);
        }

        // Preencher attendeesJson com os dados do contato informado
        String attendeesJson = null;
        if (request.getContactName() != null && !request.getContactName().isEmpty()) {
            try {
                List<Map<String, String>> attendeesList = new ArrayList<>();
                Map<String, String> attendee = new HashMap<>();
                // Sempre incluir nome
                attendee.put("name", request.getContactName());
                // Email se disponível, senão usar nome como fallback
                if (request.getContactEmail() != null && !request.getContactEmail().isEmpty()) {
                    attendee.put("email", request.getContactEmail());
                } else {
                    // Se não tem email, ainda assim criar o attendee com o nome
                    attendee.put("email", request.getContactName().toLowerCase().replace(" ", ".") + "@sem-email.com");
                }
                attendee.put("status", "needsAction"); // Status padrão para novos eventos
                attendeesList.add(attendee);
                
                ObjectMapper objectMapper = new ObjectMapper();
                attendeesJson = objectMapper.writeValueAsString(attendeesList);
            } catch (Exception e) {
                System.err.println("Failed to serialize attendees: " + e.getMessage());
            }
        }

        Meeting meeting = Meeting.builder()
                .company(company)
                .lead(lead)
                .title(request.getTitle() != null ? request.getTitle() : "Reunião com " + request.getContactName())
                .contactName(request.getContactName())
                .contactEmail(request.getContactEmail())
                .contactPhone(request.getContactPhone())
                .meetingDate(request.getMeetingDate())
                .meetingTime(request.getMeetingTime())
                .durationMinutes(request.getDurationMinutes() != null ? request.getDurationMinutes() : 30)
                .status(request.getStatus() != null ? request.getStatus() : MeetingStatus.SCHEDULED)
                .notes(request.getNotes())
                .scheduledBy(request.getScheduledBy() != null ? request.getScheduledBy() : "Usuário")
                .meetingLink(request.getMeetingLink())
                .attendeesJson(attendeesJson)
                .build();

        meeting = meetingRepository.save(meeting);

        // Sync with Google Calendar
        try {
            String googleEventId = googleDriveService.createCalendarEvent(company, meeting);
            if (googleEventId != null) {
                // Preservar attendeesJson ao atualizar
                String preservedAttendeesJson = meeting.getAttendeesJson();
                meeting.setGoogleEventId(googleEventId);
                // Garantir que attendeesJson não seja perdido
                if (preservedAttendeesJson != null) {
                    meeting.setAttendeesJson(preservedAttendeesJson);
                }
                meeting = meetingRepository.save(meeting);
            }
        } catch (Exception e) {
            // Log error but proceed
            System.err.println("Failed to sync with Google Calendar: " + e.getMessage());
        }

        // Recarregar do banco para garantir que temos os dados mais atualizados
        meeting = meetingRepository.findById(meeting.getId()).orElse(meeting);
        return toResponse(meeting);
    }

    /**
     * Atualiza uma reunião
     */
    @Transactional
    public MeetingResponse updateMeeting(Company company, UUID id, MeetingRequest request) {
        Meeting meeting = meetingRepository.findByIdAndCompany(id, company)
                .orElseThrow(() -> new RuntimeException("Reunião não encontrada"));

        if (request.getTitle() != null)
            meeting.setTitle(request.getTitle());
        meeting.setContactName(request.getContactName());
        meeting.setContactEmail(request.getContactEmail());
        meeting.setContactPhone(request.getContactPhone());
        meeting.setMeetingDate(request.getMeetingDate());
        meeting.setMeetingTime(request.getMeetingTime());
        if (request.getDurationMinutes() != null)
            meeting.setDurationMinutes(request.getDurationMinutes());
        if (request.getStatus() != null) {
            meeting.setStatus(request.getStatus());
            meeting.setManualUpdate(true);
        }
        meeting.setNotes(request.getNotes());
        meeting.setMeetingLink(request.getMeetingLink());

        if (request.getLeadId() != null) {
            Lead lead = leadRepository.findByIdAndCompany(request.getLeadId(), company).orElse(null);
            meeting.setLead(lead);
        }

        // Atualizar attendeesJson se o email do contato mudou ou se não existe
        boolean emailChanged = request.getContactEmail() != null && 
                               !request.getContactEmail().equals(meeting.getContactEmail());
        boolean hasNoAttendees = meeting.getAttendeesJson() == null || meeting.getAttendeesJson().isEmpty();
        
        if ((emailChanged || hasNoAttendees) && request.getContactEmail() != null && !request.getContactEmail().isEmpty()) {
            try {
                List<Map<String, String>> attendeesList = new ArrayList<>();
                Map<String, String> attendee = new HashMap<>();
                attendee.put("email", request.getContactEmail());
                attendee.put("name", request.getContactName() != null ? request.getContactName() : request.getContactEmail());
                attendee.put("status", "needsAction");
                attendeesList.add(attendee);
                
                ObjectMapper objectMapper = new ObjectMapper();
                meeting.setAttendeesJson(objectMapper.writeValueAsString(attendeesList));
            } catch (Exception e) {
                System.err.println("Failed to serialize attendees: " + e.getMessage());
            }
        }

        meeting = meetingRepository.save(meeting);

        // Sync with Google Calendar
        try {
            googleDriveService.updateCalendarEvent(company, meeting);
        } catch (Exception e) {
            System.err.println("Failed to sync update with Google Calendar: " + e.getMessage());
        }

        // Recarregar do banco para garantir dados atualizados
        meeting = meetingRepository.findById(meeting.getId()).orElse(meeting);
        return toResponse(meeting);
    }

    /**
     * Atualiza o status de uma reunião
     */
    @Transactional
    public MeetingResponse updateMeetingStatus(Company company, UUID id, MeetingStatus status) {
        Meeting meeting = meetingRepository.findByIdAndCompany(id, company)
                .orElseThrow(() -> new RuntimeException("Reunião não encontrada"));
        meeting.setStatus(status);
        meeting.setManualUpdate(true);
        meeting = meetingRepository.save(meeting);
        return toResponse(meeting);
    }

    /**
     * Deleta uma reunião
     */
    @Transactional
    public void deleteMeeting(Company company, UUID id) {
        Meeting meeting = meetingRepository.findByIdAndCompany(id, company)
                .orElseThrow(() -> new RuntimeException("Reunião não encontrada"));
        // Sync deletion with Google Calendar
        try {
            googleDriveService.deleteCalendarEvent(company, meeting.getGoogleEventId());
        } catch (Exception e) {
            System.err.println("Failed to sync deletion with Google Calendar: " + e.getMessage());
        }

        meetingRepository.delete(meeting);
    }

    /**
     * Calcula estatísticas
     */
    private CalendarResponse.CalendarStats calculateStats(Company company) {
        long completed = meetingRepository.countCompletedByCompany(company);
        long finished = meetingRepository.countFinishedByCompany(company);
        long noShow = meetingRepository.countByCompanyAndStatus(company, MeetingStatus.NO_SHOW);
        long total = meetingRepository.countByCompanyAndStatus(company, MeetingStatus.SCHEDULED) + finished;

        double showUpRate = finished > 0 ? (double) completed / finished * 100 : 0;

        return CalendarResponse.CalendarStats.builder()
                .totalMeetings(total)
                .completedMeetings(completed)
                .noShowMeetings(noShow)
                .showUpRate(Math.round(showUpRate * 10) / 10.0)
                .build();
    }

    /**
     * Converte entidade para DTO
     */
    private MeetingResponse toResponse(Meeting meeting) {
        // Calcula a contagem de participantes
        int attendeesCount = 0;
        if (meeting.getAttendeesJson() != null && !meeting.getAttendeesJson().isEmpty()) {
            try {
                @SuppressWarnings("unchecked")
                List<Map<String, String>> attendees = new com.fasterxml.jackson.databind.ObjectMapper()
                        .readValue(meeting.getAttendeesJson(), List.class);
                attendeesCount = attendees.size();
            } catch (Exception e) {
                // Ignora erro de parsing
            }
        }

        // Determina a fonte do evento
        String source = meeting.getGoogleEventId() != null ? "Google Calendar" : "Manual";

        return MeetingResponse.builder()
                .id(meeting.getId())
                .title(meeting.getTitle())
                .contactName(meeting.getContactName())
                .contactEmail(meeting.getContactEmail())
                .contactPhone(meeting.getContactPhone())
                .meetingDate(meeting.getMeetingDate())
                .meetingTime(meeting.getMeetingTime())
                .meetingTimeFormatted(meeting.getMeetingTime().format(TIME_FORMATTER))
                .durationMinutes(meeting.getDurationMinutes())
                .status(meeting.getStatus().name())
                .statusLabel(STATUS_LABELS.getOrDefault(meeting.getStatus(), meeting.getStatus().name()))
                .notes(meeting.getNotes())
                .scheduledBy(meeting.getScheduledBy())
                .meetingLink(meeting.getMeetingLink())
                .leadId(meeting.getLead() != null ? meeting.getLead().getId() : null)
                .createdAt(meeting.getCreatedAt())
                // Novos campos
                .attendeesJson(meeting.getAttendeesJson())
                .googleEventId(meeting.getGoogleEventId())
                .source(source)
                .attendeesCount(attendeesCount)
                .build();
    }
}
