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
public class ConsultancyHistoryRowDto {
    private UUID id;
    private String dateLabel;
    private String typeLabel;
    private String durationLabel;
    private String topicsLine;
    private boolean hasRecording;
    private boolean hasSummary;
    private boolean hasTranscription;
}
