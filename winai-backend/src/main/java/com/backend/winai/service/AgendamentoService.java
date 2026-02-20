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
import java.util.UUID;
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

    public List<String> getAvailableSlotsForDays(Company company, LocalDate fromDate, int days) {
        return getAvailableSlotsForDays(company, fromDate, days, null);
    }

    /**
     * Get available slots for multiple days. Máximo 2 horários por dia.
     * preferencia: "manha", "tarde", "noite" ou null/vazio para todos.
     */
    public List<String> getAvailableSlotsForDays(Company company, LocalDate fromDate, int days, String preferencia) {
        List<String> all = new ArrayList<>();
        for (int i = 0; i < days; i++) {
            LocalDate d = fromDate.plusDays(i);
            List<String> daySlots = getAvailableSlots(company, d);
            if (daySlots.isEmpty()) continue;
            // Filtra por preferência (manhã, tarde, noite)
            if (preferencia != null && !preferencia.trim().isEmpty()) {
                daySlots = filterSlotsByTimePreference(daySlots, preferencia.trim().toLowerCase());
                if (daySlots.isEmpty()) continue;
            }
            // Máximo 2 por dia
            int limit = Math.min(2, daySlots.size());
            for (int j = 0; j < limit; j++) {
                all.add(d.format(DateTimeFormatter.ISO_LOCAL_DATE) + " " + daySlots.get(j));
            }
        }
        return all;
    }

    /**
     * Filtra slots HH:mm por período: manha (06-12), tarde (12-18), noite (18-22).
     */
    public List<String> filterSlotsByTimePreference(List<String> slots, String preferencia) {
        if (slots == null || preferencia == null || preferencia.isEmpty()) return slots != null ? slots : List.of();
        LocalTime minInclusive;
        LocalTime maxExclusive;
        switch (preferencia) {
            case "manha":
            case "manhã":
                minInclusive = LocalTime.of(6, 0);
                maxExclusive = LocalTime.of(12, 0);
                break;
            case "tarde":
                minInclusive = LocalTime.of(12, 0);
                maxExclusive = LocalTime.of(18, 0);
                break;
            case "noite":
                minInclusive = LocalTime.of(18, 0);
                maxExclusive = LocalTime.of(22, 0);
                break;
            default:
                return slots;
        }
        return slots.stream()
                .filter(s -> {
                    try {
                        LocalTime t = LocalTime.parse(s, TIME_FMT);
                        return !t.isBefore(minInclusive) && t.isBefore(maxExclusive);
                    } catch (Exception e) {
                        return false;
                    }
                })
                .collect(Collectors.toList());
    }

    /**
     * Formata slots para exibição ao usuário: "Seg 23/02: 09:00, 10:00" (máx 2/dia).
     */
    public String formatSlotsForDisplay(List<String> rawSlots) {
        if (rawSlots == null || rawSlots.isEmpty()) return "";
        java.util.Map<String, java.util.List<String>> byDay = new java.util.LinkedHashMap<>();
        DateTimeFormatter dayFmt = DateTimeFormatter.ofPattern("dd/MM");
        DateTimeFormatter dayNameFmt = DateTimeFormatter.ofPattern("EEEE", java.util.Locale.forLanguageTag("pt-BR"));
        for (String s : rawSlots) {
            String[] parts = s.split(" ");
            if (parts.length >= 2) {
                try {
                    LocalDate date = LocalDate.parse(parts[0]);
                    String dayKey = date.format(DateTimeFormatter.ISO_LOCAL_DATE);
                    byDay.computeIfAbsent(dayKey, k -> new ArrayList<>()).add(parts[1]);
                } catch (Exception ignored) {}
            }
        }
        StringBuilder sb = new StringBuilder();
        for (var e : byDay.entrySet()) {
            LocalDate d = LocalDate.parse(e.getKey());
            String diaNome = d.format(dayNameFmt);
            String diaNum = d.format(dayFmt);
            List<String> horas = e.getValue();
            if (horas.size() > 2) horas = horas.subList(0, 2);
            sb.append(capitalize(diaNome)).append(" ").append(diaNum).append(": ")
                    .append(String.join(", ", horas)).append("\n");
        }
        return sb.toString().trim();
    }

    private static String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return s.substring(0, 1).toUpperCase() + s.substring(1).toLowerCase();
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

        // Descrição completa para o dono do calendário: contato, resumo do lead (GPT) e observações
        StringBuilder desc = new StringBuilder();
        desc.append("Cliente: ").append(nome);
        if (telefone != null && !telefone.isEmpty())
            desc.append("\nTelefone: ").append(telefone);
        if (email != null && !email.trim().isEmpty())
            desc.append("\nE-mail: ").append(email);
        else
            desc.append("\nContato via WhatsApp (sem e-mail)");
        desc.append("\n");
        if (lead != null && lead.getAiSummary() != null && !lead.getAiSummary().trim().isEmpty()) {
            desc.append("\n--- Resumo do lead (IA) ---\n");
            desc.append(lead.getAiSummary().trim());
            desc.append("\n");
        }
        if (notes != null && !notes.trim().isEmpty()) {
            desc.append("\n--- Observações ---\n");
            desc.append(notes.trim());
        }
        String notesFinal = desc.toString().trim();

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
     * Lista agendamentos futuros do lead (por leadId ou telefone).
     */
    public List<Meeting> listUpcomingMeetingsForLead(Company company, Lead lead, String phone) {
        UUID leadId = lead != null ? lead.getId() : null;
        String phoneStr = (phone != null && !phone.trim().isEmpty()) ? phone.trim() : null;
        if (leadId == null && phoneStr == null)
            return List.of();
        return meetingRepository.findUpcomingByLeadOrPhone(company, leadId,
                phoneStr != null && !phoneStr.isEmpty() ? phoneStr : null, LocalDate.now());
    }

    /**
     * Reagenda: cria novo agendamento e cancela o antigo em uma única operação.
     * Ordem: cria primeiro, depois cancela (evita perder o antigo se criar falhar).
     */
    @Transactional
    public String rescheduleMeeting(Company company, Lead lead, UUID oldMeetingId, String nome, String email,
            String telefone, String dataStr, String horaStr, String title, String notes) {
        Optional<Meeting> oldOpt = meetingRepository.findByIdAndCompany(oldMeetingId, company);
        if (oldOpt.isEmpty())
            return "Agendamento antigo não encontrado.";
        Meeting oldMeeting = oldOpt.get();
        if (oldMeeting.getStatus() == MeetingStatus.CANCELLED)
            return "O agendamento antigo já foi cancelado.";
        try {
            String createResult = createAppointment(company, lead, nome, email, telefone, dataStr, horaStr, title, notes);
            cancelMeeting(company, oldMeetingId);
            return createResult + " O agendamento anterior foi cancelado.";
        } catch (Exception e) {
            log.error("Erro ao reagendar", e);
            return "Erro ao criar novo agendamento: " + e.getMessage();
        }
    }

    /**
     * Cancela um agendamento (Meeting + Google Calendar). Retorna mensagem de sucesso ou erro.
     */
    @Transactional
    public String cancelMeeting(Company company, UUID meetingId) {
        Optional<Meeting> opt = meetingRepository.findByIdAndCompany(meetingId, company);
        if (opt.isEmpty())
            return "Agendamento não encontrado.";
        Meeting m = opt.get();
        if (m.getStatus() == MeetingStatus.CANCELLED)
            return "Este agendamento já foi cancelado.";
        try {
            if (m.getGoogleEventId() != null && !m.getGoogleEventId().isEmpty()) {
                try {
                    googleDriveService.deleteCalendarEvent(company, m.getGoogleEventId());
                } catch (Exception ex) {
                    log.warn("Não foi possível remover do Google Calendar (evento pode já estar excluído): {}", ex.getMessage());
                }
            }
            m.setStatus(MeetingStatus.CANCELLED);
            meetingRepository.save(m);
            return "Agendamento de " + m.getMeetingDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                    + " às " + m.getMeetingTime().format(TIME_FMT) + " foi cancelado com sucesso.";
        } catch (Exception e) {
            log.error("Erro ao cancelar agendamento", e);
            return "Erro ao cancelar: " + e.getMessage();
        }
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
