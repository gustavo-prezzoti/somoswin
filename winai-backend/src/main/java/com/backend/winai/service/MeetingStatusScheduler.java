package com.backend.winai.service;

import com.backend.winai.entity.Meeting;
import com.backend.winai.entity.MeetingStatus;
import com.backend.winai.repository.MeetingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MeetingStatusScheduler {

    private final MeetingRepository meetingRepository;

    /**
     * Executa a cada hora para atualizar o status das reuniões que já passaram
     * Define como COMPLETED se a data/hora + duração for menor que o momento atual
     * Utiliza o fuso horário de Brasília (America/Sao_Paulo)
     */
    @Scheduled(cron = "0 0 * * * *") // A cada hora cheia
    @Transactional
    public void updatePastMeetingsStatus() {
        log.info("Iniciando atualização automática de status de reuniões passadas...");

        ZoneId zoneId = ZoneId.of("America/Sao_Paulo");
        LocalDate today = LocalDate.now(zoneId);
        LocalTime now = LocalTime.now(zoneId);

        // Busca todas as reuniões agendadas
        // Em um cenário real com muitos dados, seria ideal filtrar no banco
        // Mas para simplificar vamos iterar e verificar
        // Uma otimização seria buscar apenas SCHEDULED com data <= hoje

        // Vamos buscar reuniões SCHEDULED que são de hoje ou antes
        // Aqui estamos simplificando buscando todas e filtrando na memória por ser um
        // MVP
        // Idealmente: meetingRepository.findExpiredScheduledMeetings(today, now);

        List<Meeting> meetings = meetingRepository.findAll(); // Otimizar se escalar muito

        int updatedCount = 0;

        for (Meeting meeting : meetings) {
            // Ignora se não for SCHEDULED ou se já teve atualização manual
            if (meeting.getStatus() == MeetingStatus.SCHEDULED && !Boolean.TRUE.equals(meeting.getManualUpdate())) {
                boolean isPastDate = meeting.getMeetingDate().isBefore(today);
                boolean isTodayAndPastTime = meeting.getMeetingDate().equals(today) &&
                        meeting.getMeetingTime().plusMinutes(meeting.getDurationMinutes()).isBefore(now);

                if (isPastDate || isTodayAndPastTime) {
                    meeting.setStatus(MeetingStatus.COMPLETED);
                    meetingRepository.save(meeting);
                    updatedCount++;
                }
            }
        }

        if (updatedCount > 0) {
            log.info("{} reuniões foram marcadas automaticamente como REALIZADA.", updatedCount);
        } else {
            log.info("Nenhuma reunião precisou ser atualizada.");
        }
    }
}
