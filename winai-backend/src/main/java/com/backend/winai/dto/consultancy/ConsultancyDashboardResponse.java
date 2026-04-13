package com.backend.winai.dto.consultancy;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsultancyDashboardResponse {

    private ConsultantProfileDto consultant;
    private String planDisplayName;
    private ConsultancyNextMeetingDto nextMeeting;
    private List<ConsultancyHistoryRowDto> history;
}
