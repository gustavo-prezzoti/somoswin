package com.backend.winai.service;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.DashboardMetrics;
import com.backend.winai.repository.DashboardMetricsRepository;
import com.backend.winai.repository.LeadRepository;
import com.backend.winai.repository.MeetingRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MetricsSyncServiceTest {

    private DashboardMetricsRepository dashboardRepo;
    private LeadRepository leadRepo;
    private MeetingRepository meetingRepo;
    private MetricsSyncService self;
    private MetricsSyncService service;
    private Company company;

    @BeforeEach
    void setup() {
        dashboardRepo = mock(DashboardMetricsRepository.class);
        leadRepo = mock(LeadRepository.class);
        meetingRepo = mock(MeetingRepository.class);
        self = mock(MetricsSyncService.class);
        service = new MetricsSyncService(dashboardRepo, leadRepo, meetingRepo, self);
        company = Company.builder().id(UUID.randomUUID()).name("Test Co").build();

        when(meetingRepo.findByCompanyAndMeetingDateBetweenOrderByMeetingDateAscMeetingTimeAsc(any(), any(), any()))
                .thenReturn(Collections.emptyList());
        when(leadRepo.countByCompanyAndCreatedAtBetween(any(), any(), any())).thenReturn(3L);
        when(dashboardRepo.findTopByCompanyAndDateOrderByIdAsc(any(), any())).thenReturn(Optional.empty());
        when(dashboardRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void syncDelegatesToSelfPerDay() {
        service.syncDashboardMetrics(company, 3);
        verify(self, times(3)).updateMetricsForDate(eq(company), any(LocalDate.class));
    }

    @Test
    void syncZeroDaysDoesNothing() {
        service.syncDashboardMetrics(company, 0);
        verify(self, never()).updateMetricsForDate(any(), any());
    }

    @Test
    void perDayErrorDoesNotStopRest() {
        org.mockito.Mockito.doThrow(new RuntimeException("boom"))
                .when(self).updateMetricsForDate(any(), eq(LocalDate.now()));
        service.syncDashboardMetrics(company, 3);
        verify(self, times(3)).updateMetricsForDate(any(), any());
    }

    @Test
    void updateMetricsForDateSavesWithLeadCount() {
        when(leadRepo.countByCompanyAndCreatedAtBetween(eq(company), any(), any())).thenReturn(7L);

        service.updateMetricsForDate(company, LocalDate.now());

        ArgumentCaptor<DashboardMetrics> captor = ArgumentCaptor.forClass(DashboardMetrics.class);
        verify(dashboardRepo).save(captor.capture());
        DashboardMetrics saved = captor.getValue();
        assertThat(saved.getLeadsCaptured()).isEqualTo(7);
        assertThat(saved.getCompany()).isEqualTo(company);
    }

    @Test
    void updateMetricsForDateUpdatesExisting() {
        DashboardMetrics existing = DashboardMetrics.builder()
                .id(99L).company(company).date(LocalDate.now()).leadsCaptured(0).build();
        when(dashboardRepo.findTopByCompanyAndDateOrderByIdAsc(eq(company), any()))
                .thenReturn(Optional.of(existing));
        when(leadRepo.countByCompanyAndCreatedAtBetween(any(), any(), any())).thenReturn(5L);

        service.updateMetricsForDate(company, LocalDate.now());

        verify(dashboardRepo).save(existing);
        assertThat(existing.getLeadsCaptured()).isEqualTo(5);
    }

    @Test
    void updateMetricsForDateSwallowsLeadRepoError() {
        when(leadRepo.countByCompanyAndCreatedAtBetween(any(), any(), any()))
                .thenThrow(new RuntimeException("statement timeout"));
        service.updateMetricsForDate(company, LocalDate.now());
        verify(dashboardRepo, never()).save(any());
    }

    @Test
    void updateMetricsForDateUsesDayBoundaries() {
        LocalDate date = LocalDate.of(2026, 5, 23);
        service.updateMetricsForDate(company, date);
        ArgumentCaptor<LocalDateTime> start = ArgumentCaptor.forClass(LocalDateTime.class);
        ArgumentCaptor<LocalDateTime> end = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(leadRepo, atLeastOnce()).countByCompanyAndCreatedAtBetween(eq(company), start.capture(), end.capture());
        assertThat(start.getValue().toLocalDate()).isEqualTo(date);
        assertThat(end.getValue().toLocalDate()).isEqualTo(date);
        assertThat(start.getValue()).isBefore(end.getValue());
    }

    @Test
    void performanceScoreScales() {
        when(leadRepo.countByCompanyAndCreatedAtBetween(any(), any(), any())).thenReturn(25L);
        service.updateMetricsForDate(company, LocalDate.now());
        ArgumentCaptor<DashboardMetrics> captor = ArgumentCaptor.forClass(DashboardMetrics.class);
        verify(dashboardRepo).save(captor.capture());
        Integer score = captor.getValue().getPerformanceScore();
        assertThat(score).isNotNull().isGreaterThanOrEqualTo(40).isLessThanOrEqualTo(100);
    }
}
