package com.backend.winai.dto.consultancy;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsultancyMeetingDetailResponse {
    private UUID id;
    private String title;
    private String dateLabel;
    private String timeLabel;
    private String durationLabel;
    private String typeLabel;
    private String recordingUrl;
    private String aiSummary;
    private String transcriptionFull;
}
