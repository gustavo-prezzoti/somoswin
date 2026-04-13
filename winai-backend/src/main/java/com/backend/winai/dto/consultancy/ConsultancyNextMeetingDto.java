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
public class ConsultancyNextMeetingDto {
    private UUID id;
    private String dateLabel;
    private String timeLabel;
    private String typeLabel;
    private String meetingLink;
    private String statusLabel;
}
