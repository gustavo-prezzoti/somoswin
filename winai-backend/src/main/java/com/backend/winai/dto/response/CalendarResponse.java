package com.backend.winai.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalendarResponse {

    private List<MeetingResponse> meetings;
    private CalendarStats stats;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CalendarStats {
        private long totalMeetings;
        private long completedMeetings;
        private long noShowMeetings;
        private double showUpRate;
    }
}
