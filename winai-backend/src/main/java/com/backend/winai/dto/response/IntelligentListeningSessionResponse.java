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
public class IntelligentListeningSessionResponse {

    private UUID id;
    private UUID leadId;
    private String leadName;
    private String title;
    private LocalDate meetingDate;
    private LocalTime meetingTime;
    private String status;
    private String statusLabel;
    private LocalDateTime createdAt;
    private String transcriptionFull;
    private String aiSummary;
}
