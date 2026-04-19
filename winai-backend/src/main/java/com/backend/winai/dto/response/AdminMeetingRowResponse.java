package com.backend.winai.dto.response;

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
public class AdminMeetingRowResponse {

    private UUID id;
    private UUID companyId;
    private String companyName;
    private UUID leadId;
    private String leadName;
    private String title;
    private String contactName;
    private String contactEmail;
    private String contactPhone;
    private LocalDate meetingDate;
    private LocalTime meetingTime;
    private Integer durationMinutes;
    private String status;
    private String statusLabel;
    private String meetingKind;
    private String meetingLink;
    private String googleEventId;
    private String scheduledBy;
    private String notes;
}
