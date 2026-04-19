package com.backend.winai.service;

import com.backend.winai.entity.*;
import com.backend.winai.repository.CompanyRepository;
import com.backend.winai.repository.ConsultancyCallRequestRepository;
import com.backend.winai.repository.MeetingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConsultancyServiceTest {

    @Mock
    private MeetingRepository meetingRepository;
    @Mock
    private CompanyRepository companyRepository;
    @Mock
    private ConsultancyCallRequestRepository consultancyCallRequestRepository;
    @Mock
    private SupabaseStorageService supabaseStorageService;
    @Mock
    private OpenAiService openAiService;

    @InjectMocks
    private ConsultancyService consultancyService;

    private User user;
    private Company company;
    private UUID companyId;

    @BeforeEach
    void setUp() {
        companyId = UUID.randomUUID();
        company = Company.builder().id(companyId).name("Test Co").build();
        user = new User();
        user.setId(UUID.randomUUID());
        user.setCompany(company);
    }

    @Test
    void getDashboard_buildsHistoryFromRepository() {
        when(companyRepository.findById(companyId)).thenReturn(Optional.of(company));

        Meeting past = Meeting.builder()
                .id(UUID.randomUUID())
                .company(company)
                .title("Call de Alinhamento")
                .contactName("Cliente")
                .meetingDate(LocalDate.of(2026, 3, 1))
                .meetingTime(LocalTime.of(14, 0))
                .durationMinutes(55)
                .status(MeetingStatus.COMPLETED)
                .meetingKind(MeetingKind.CONSULTANCY)
                .notes("OKRs")
                .build();

        when(meetingRepository.findUpcomingConsultancy(eq(company), eq(MeetingKind.CONSULTANCY), any(LocalDate.class),
                any(LocalTime.class)))
                .thenReturn(List.of());
        when(meetingRepository.findConsultancyHistory(eq(company), eq(MeetingKind.CONSULTANCY), any(LocalDate.class)))
                .thenReturn(List.of(past));
        when(consultancyCallRequestRepository.findByCompany_IdOrderByCreatedAtDesc(eq(companyId), any(Pageable.class)))
                .thenReturn(Collections.emptyList());

        var dash = consultancyService.getDashboard(user);

        assertNotNull(dash);
        assertEquals(1, dash.getHistory().size());
        assertEquals("55 min", dash.getHistory().get(0).getDurationLabel());
    }
}
