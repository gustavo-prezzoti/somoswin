package com.backend.winai.dto.request;

import com.backend.winai.entity.MeetingStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeetingRequest {

    private String title;

    @NotBlank(message = "Nome do contato é obrigatório")
    private String contactName;

    private String contactEmail;

    private String contactPhone;

    @NotNull(message = "Data da reunião é obrigatória")
    private LocalDate meetingDate;

    @NotNull(message = "Horário da reunião é obrigatório")
    private LocalTime meetingTime;

    private Integer durationMinutes;

    private MeetingStatus status;

    private String notes;

    private String scheduledBy;

    private String meetingLink;

    private UUID leadId;
}
