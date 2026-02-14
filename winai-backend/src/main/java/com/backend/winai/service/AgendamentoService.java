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

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
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
                        .build());

        return AgendamentoConfigDTO.builder()
                .enabled(config.getEnabled())
                .startTime(config.getStartTime().format(TIME_FMT))
                .endTime(config.getEndTime().format(TIME_FMT))
                .slotDurationMinutes(config.getSlotDurationMinutes())
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

        config = configRepository.save(config);

        return AgendamentoConfigDTO.builder()
                .enabled(config.getEnabled())
                .startTime(config.getStartTime().format(TIME_FMT))
                .endTime(config.getEndTime().format(TIME_FMT))
                .slotDurationMinutes(config.getSlotDurationMinutes())
                .googleConnected(googleConnected)
                .canEnable(googleConnected)
                .build();
    }

    /**
     * Get available slots for a date. Returns empty if agendamento disabled or Google not connected.
     */
    public List<String> getAvailableSlots(Company company, LocalDate date) {
        Optional<AgendamentoConfig> opt = configRepository.findByCompany(company);
        if (opt.isEmpty() || !Boolean.TRUE.equals(opt.get().getEnabled()))
            return List.of();

        if (!driveConnectionRepository.findByCompany(company).filter(c -> c.isConnected()).isPresent())
            return List.of();

        AgendamentoConfig cfg = opt.get();
        return googleDriveService.getAvailableSlots(company, date, cfg.getStartTime(), cfg.getEndTime(),
                cfg.getSlotDurationMinutes());
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

        LocalDate date = LocalDate.parse(dataStr);
        LocalTime time = LocalTime.parse(horaStr, TIME_FMT);
        int duration = opt.get().getSlotDurationMinutes();

        Meeting meeting = Meeting.builder()
                .company(company)
                .lead(lead)
                .title(title != null && !title.isEmpty() ? title : "Agendamento - " + nome)
                .contactName(nome)
                .contactEmail(email)
                .contactPhone(telefone)
                .meetingDate(date)
                .meetingTime(time)
                .durationMinutes(duration)
                .status(MeetingStatus.SCHEDULED)
                .notes(notes)
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
}
