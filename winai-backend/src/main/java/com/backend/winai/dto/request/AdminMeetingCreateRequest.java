package com.backend.winai.dto.request;

import com.backend.winai.entity.MeetingKind;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminMeetingCreateRequest {

    @NotNull
    private UUID companyId;

    private String title;

    @NotBlank
    private String contactName;

    private String contactEmail;
    private String contactPhone;

    @NotNull
    private LocalDate meetingDate;

    @NotNull
    private LocalTime meetingTime;

    private Integer durationMinutes;
    private String notes;
    private String meetingLink;
    private UUID leadId;
    private MeetingKind meetingKind;
}
