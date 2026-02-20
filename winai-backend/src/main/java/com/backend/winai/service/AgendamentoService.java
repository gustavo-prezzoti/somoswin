package com.backend.winai.service;

import com.backend.winai.dto.agendamento.AgendamentoConfigDTO;
import com.backend.winai.entity.AgendamentoConfig;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.Lead;
import com.backend.winai.entity.Meeting;
import com.backend.winai.entity.MeetingStatus;
import com.backend.winai.entity.User;
import com.backend.winai.repository.AgendamentoConfigRepository;
import com.backend.winai.repository.GoogleDriveConnectionRepository;
import com.backend.winai.repository.MeetingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AgendamentoService {

    private final AgendamentoConfigRepository configRepository;
    private final GoogleDriveConnectionRepository driveConnectionRepository;
    private final GoogleDriveService googleDriveService;
    private final MeetingRepository meetingRepository;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    public AgendamentoConfigDTO getConfig(User user) {
        Company company = user.getCompany();
        boolean googleConnected = driveConnectionRepository.findByCompany(company)
                .filter(c -> c.isConnected())
                .isPresent();

        AgendamentoConfig config = configRepository.findByCompany(company)
                .orElse(AgendamentoConfig.builder()
                        .company(company)
                        .enabled(false)
                        .startTime(LocalTime.of(9, 0))
                        .endTime(LocalTime.of(18, 0))
                        .slotDurationMinutes(30)
                        .attendanceDays("MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY")
                        .excludeHolidays(true)
                        .build());

        List<String> attendanceDaysList = parseAttendanceDays(config.getAttendanceDays());

        return AgendamentoConfigDTO.builder()
                .enabled(config.getEnabled())
                .startTime(config.getStartTime().format(TIME_FMT))
                .endTime(config.getEndTime().format(TIME_FMT))
                .slotDurationMinutes(config.getSlotDurationMinutes())
                .attendanceDays(attendanceDaysList)
                .excludeHolidays(config.getExcludeHolidays() != null ? config.getExcludeHolidays() : true)
                .googleConnected(googleConnected)
                .canEnable(googleConnected)
                .build();
    }

    @Transactional
    public AgendamentoConfigDTO updateConfig(User user, AgendamentoConfigDTO dto) {
        Company company = user.getCompany();
        boolean googleConnected = driveConnectionRepository.findByCompany(company)
                .filter(c -> c.isConnected())
                .isPresent();

        if (Boolean.TRUE.equals(dto.getEnabled()) && !googleConnected) {
            throw new IllegalStateException(
                    "Não é possível ativar o agendamento sem conectar o Google Calendar. Conecte em Conexões Neurais.");
        }

        AgendamentoConfig config = configRepository.findByCompany(company)
                .orElse(AgendamentoConfig.builder().company(company).build());

        if (dto.getEnabled() != null)
            config.setEnabled(dto.getEnabled());
        if (dto.getStartTime() != null && !dto.getStartTime().isEmpty())
            config.setStartTime(LocalTime.parse(dto.getStartTime(), TIME_FMT));
        if (dto.getEndTime() != null && !dto.getEndTime().isEmpty())
            config.setEndTime(LocalTime.parse(dto.getEndTime(), TIME_FMT));
        if (dto.getSlotDurationMinutes() != null)
            config.setSlotDurationMinutes(dto.getSlotDurationMinutes());
        if (dto.getAttendanceDays() != null && !dto.getAttendanceDays().isEmpty())
            config.setAttendanceDays(String.join(",", dto.getAttendanceDays()));
        else if (dto.getAttendanceDays() != null && dto.getAttendanceDays().isEmpty())
            config.setAttendanceDays(null); // todos os dias
        if (dto.getExcludeHolidays() != null)
            config.setExcludeHolidays(dto.getExcludeHolidays());

        config = configRepository.save(config);

        List<String> attendanceDaysList = parseAttendanceDays(config.getAttendanceDays());

        return AgendamentoConfigDTO.builder()
                .enabled(config.getEnabled())
                .startTime(config.getStartTime().format(TIME_FMT))
                .endTime(config.getEndTime().format(TIME_FMT))
                .slotDurationMinutes(config.getSlotDurationMinutes())
                .attendanceDays(attendanceDaysList)
                .excludeHolidays(config.getExcludeHolidays() != null ? config.getExcludeHolidays() : true)
                .googleConnected(googleConnected)
                .canEnable(googleConnected)
                .build();
    }

    /**
     * Get available slots for a date. Returns empty if agendamento disabled, Google not connected,
     * date is not an attendance day, or date is a holiday (when excludeHolidays).
     */
    public List<String> getAvailableSlots(Company company, LocalDate date) {
        Optional<AgendamentoConfig> opt = configRepository.findByCompany(company);
        if (opt.isEmpty() || !Boolean.TRUE.equals(opt.get().getEnabled()))
            return List.of();

        if (!driveConnectionRepository.findByCompany(company).filter(c -> c.isConnected()).isPresent())
            return List.of();

        AgendamentoConfig cfg = opt.get();

        // Filtrar por dia de atendimento
        Set<DayOfWeek> allowedDays = parseAttendanceDaysToSet(cfg.getAttendanceDays());
        if (allowedDays != null && !allowedDays.contains(date.getDayOfWeek()))
            return List.of();

        // Filtrar feriados
        if (Boolean.TRUE.equals(cfg.getExcludeHolidays()) && BrazilianHolidayCalendar.isHoliday(date))
            return List.of();

        return googleDriveService.getAvailableSlots(company, date, cfg.getStartTime(), cfg.getEndTime(),
                cfg.getSlotDurationMinutes());
    }

    private static List<String> parseAttendanceDays(String raw) {
        if (raw == null || raw.trim().isEmpty())
            return List.of("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY");
        return Arrays.stream(raw.split(",")).map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.toList());
    }

    private static java.util.Set<DayOfWeek> parseAttendanceDaysToSet(String raw) {
        if (raw == null || raw.trim().isEmpty())
            return null; // todos os dias
        List<String> days = parseAttendanceDays(raw);
        if (days.isEmpty())
            return null;
        return days.stream()
                .map(d -> {
                    try {
                        return DayOfWeek.valueOf(d.toUpperCase());
                    } catch (Exception e) {
                        return null;
                    }
                })
                .filter(d -> d != null)
                .collect(Collectors.toSet());
    }

    /**
     * Get available slots for multiple days (e.g. next 7 days).
     */
    public List<String> getAvailableSlotsForDays(Company company, LocalDate fromDate, int days) {
        List<String> all = new ArrayList<>();
        for (int i = 0; i < days; i++) {
            LocalDate d = fromDate.plusDays(i);
            List<String> daySlots = getAvailableSlots(company, d);
            for (String slot : daySlots) {
                all.add(d.format(DateTimeFormatter.ISO_LOCAL_DATE) + " " + slot);
            }
        }
        return all;
    }

    /**
     * Create appointment: Meeting + Google Calendar event.
     * Lead data: nome, email, telefone (no CPF).
     */
    @Transactional
    public String createAppointment(Company company, Lead lead, String nome, String email, String telefone,
            String dataStr, String horaStr, String title, String notes) {
        Optional<AgendamentoConfig> opt = configRepository.findByCompany(company);
        if (opt.isEmpty() || !Boolean.TRUE.equals(opt.get().getEnabled()))
            throw new IllegalStateException("Agendamento não está ativo para esta empresa.");

        if (!driveConnectionRepository.findByCompany(company).filter(c -> c.isConnected()).isPresent())
            throw new IllegalStateException("Google Calendar não conectado.");

        LocalDate date;
        LocalTime time;
        try {
            date = LocalDate.parse(dataStr);
        } catch (Exception e) {
            throw new IllegalArgumentException("Data inválida. Use o formato YYYY-MM-DD (ex: 2025-02-19). Recebido: " + dataStr);
        }
        try {
            time = LocalTime.parse(horaStr, TIME_FMT);
        } catch (Exception e) {
            throw new IllegalArgumentException("Hora inválida. Use o formato HH:mm (ex: 09:00 ou 14:30). Recebido: " + horaStr);
        }
        int duration = opt.get().getSlotDurationMinutes();

        // Quando sem e-mail: descrição completa para o dono do calendário (empresa) saber para quem é e do que se trata
        String notesFinal = notes;
        if (email == null || email.trim().isEmpty()) {
            StringBuilder desc = new StringBuilder("Cliente: ").append(nome);
            if (telefone != null && !telefone.isEmpty())
                desc.append(" | Telefone: ").append(telefone);
            desc.append(" | Contato via WhatsApp (sem e-mail)");
            if (notes != null && !notes.trim().isEmpty())
                desc.append("\n").append(notes);
            notesFinal = desc.toString();
        }

        Meeting meeting = Meeting.builder()
                .company(company)
                .lead(lead)
                .title(title != null && !title.isEmpty() ? title : "Agendamento - " + nome)
                .contactName(nome)
                .contactEmail(email != null && !email.trim().isEmpty() ? email : null)
                .contactPhone(telefone)
                .meetingDate(date)
                .meetingTime(time)
                .durationMinutes(duration)
                .status(MeetingStatus.SCHEDULED)
                .notes(notesFinal)
                .scheduledBy("IA")
                .build();

        meeting = meetingRepository.save(meeting);

        String googleEventId = googleDriveService.createCalendarEvent(company, meeting);
        if (googleEventId != null) {
            meeting.setGoogleEventId(googleEventId);
            meetingRepository.save(meeting);
        }

        return "Agendamento realizado com sucesso para " + date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                + " às " + horaStr + "!";
    }

    public boolean isAgendamentoEnabledForCompany(Company company) {
        return configRepository.findByCompany(company)
                .filter(c -> Boolean.TRUE.equals(c.getEnabled()))
                .filter(c -> driveConnectionRepository.findByCompany(company).filter(conn -> conn.isConnected()).isPresent())
                .isPresent();
    }

    public Optional<AgendamentoConfig> getConfigForCompany(Company company) {
        return configRepository.findByCompany(company);
    }

    /**
     * Retorna resumo da config para o prompt da IA (dias de atendimento, feriados).
     */
    public String getConfigSummaryForPrompt(Company company) {
        return configRepository.findByCompany(company)
                .map(cfg -> {
                    StringBuilder sb = new StringBuilder();
                    List<String> days = parseAttendanceDays(cfg.getAttendanceDays());
                    if (days != null && !days.isEmpty() && days.size() < 7) {
                        String diasStr = days.stream()
                                .map(d -> {
                                    try {
                                        return DayOfWeek.valueOf(d).getDisplayName(java.time.format.TextStyle.FULL, new java.util.Locale("pt", "BR"));
                                    } catch (Exception e) {
                                        return d;
                                    }
                                })
                                .collect(Collectors.joining(", "));
                        sb.append("Dias de atendimento: ").append(diasStr).append(". ");
                    }
                    if (Boolean.TRUE.equals(cfg.getExcludeHolidays())) {
                        sb.append("Feriados brasileiros não estão disponíveis para agendamento.");
                    }
                    return sb.toString().trim();
                })
                .orElse("");
    }
}
