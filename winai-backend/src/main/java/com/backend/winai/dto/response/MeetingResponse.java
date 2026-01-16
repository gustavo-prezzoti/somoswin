package com.backend.winai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeetingResponse {

    private UUID id;
    private String title;
    private String contactName;
    private String contactEmail;
    private String contactPhone;
    private LocalDate meetingDate;
    private LocalTime meetingTime;
    private String meetingTimeFormatted;
    private Integer durationMinutes;
    private String status;
    private String statusLabel;
    private String notes;
    private String scheduledBy;
    private String meetingLink;
    private UUID leadId;
    private LocalDateTime createdAt;

    // Novos campos para exibir participantes completos
    private String attendeesJson; // JSON com todos os participantes [{email, name, status}]
    private String googleEventId; // ID do evento no Google Calendar
    private String source; // "Google Calendar" ou "Manual"
    private Integer attendeesCount; // Quantidade total de participantes
}
