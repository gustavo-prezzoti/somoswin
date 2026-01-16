package com.backend.winai.controller;

import com.backend.winai.dto.request.MeetingRequest;
import com.backend.winai.dto.response.CalendarResponse;
import com.backend.winai.dto.response.MeetingResponse;
import com.backend.winai.dto.response.MessageResponse;
import com.backend.winai.entity.MeetingStatus;
import com.backend.winai.entity.User;
import com.backend.winai.repository.UserRepository;
import com.backend.winai.service.MeetingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/meetings")
@RequiredArgsConstructor
public class MeetingController {

    private final MeetingService meetingService;
    private final UserRepository userRepository;

    /**
     * GET /api/v1/meetings/calendar
     * Obtém reuniões e estatísticas para um período
     */
    @GetMapping("/calendar")
    public ResponseEntity<CalendarResponse> getCalendar(
            @AuthenticationPrincipal User user,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        User userWithCompany = getUserWithCompany(user);
        if (userWithCompany.getCompany() == null) {
            return ResponseEntity.ok(CalendarResponse.builder()
                    .meetings(List.of())
                    .stats(CalendarResponse.CalendarStats.builder()
                            .totalMeetings(0)
                            .completedMeetings(0)
                            .noShowMeetings(0)
                            .showUpRate(0)
                            .build())
                    .build());
        }
        CalendarResponse calendar = meetingService.getCalendarData(
                userWithCompany.getCompany(), startDate, endDate);
        return ResponseEntity.ok(calendar);
    }

    /**
     * GET /api/v1/meetings/date/{date}
     * Lista reuniões de um dia específico
     */
    @GetMapping("/date/{date}")
    public ResponseEntity<List<MeetingResponse>> getMeetingsForDate(
            @AuthenticationPrincipal User user,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        User userWithCompany = getUserWithCompany(user);
        if (userWithCompany.getCompany() == null) {
            return ResponseEntity.ok(List.of());
        }
        List<MeetingResponse> meetings = meetingService.getMeetingsForDate(userWithCompany.getCompany(), date);
        return ResponseEntity.ok(meetings);
    }

    /**
     * GET /api/v1/meetings/{id}
     * Busca reunião por ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<MeetingResponse> getMeetingById(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        User userWithCompany = getUserWithCompany(user);
        MeetingResponse meeting = meetingService.getMeetingById(userWithCompany.getCompany(), id);
        return ResponseEntity.ok(meeting);
    }

    /**
     * POST /api/v1/meetings
     * Cria uma nova reunião
     */
    @PostMapping
    public ResponseEntity<MeetingResponse> createMeeting(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody MeetingRequest request) {
        User userWithCompany = getUserWithCompany(user);
        if (userWithCompany.getCompany() == null) {
            throw new RuntimeException("Usuário não possui empresa associada");
        }
        MeetingResponse meeting = meetingService.createMeeting(userWithCompany.getCompany(), request);
        return ResponseEntity.ok(meeting);
    }

    /**
     * PUT /api/v1/meetings/{id}
     * Atualiza uma reunião
     */
    @PutMapping("/{id}")
    public ResponseEntity<MeetingResponse> updateMeeting(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody MeetingRequest request) {
        User userWithCompany = getUserWithCompany(user);
        MeetingResponse meeting = meetingService.updateMeeting(userWithCompany.getCompany(), id, request);
        return ResponseEntity.ok(meeting);
    }

    /**
     * PATCH /api/v1/meetings/{id}/status
     * Atualiza o status de uma reunião
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<MeetingResponse> updateMeetingStatus(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @RequestParam MeetingStatus status) {
        User userWithCompany = getUserWithCompany(user);
        MeetingResponse meeting = meetingService.updateMeetingStatus(userWithCompany.getCompany(), id, status);
        return ResponseEntity.ok(meeting);
    }

    /**
     * DELETE /api/v1/meetings/{id}
     * Deleta uma reunião
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponse> deleteMeeting(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        User userWithCompany = getUserWithCompany(user);
        meetingService.deleteMeeting(userWithCompany.getCompany(), id);
        return ResponseEntity.ok(MessageResponse.success("Reunião removida com sucesso"));
    }

    private User getUserWithCompany(User user) {
        return userRepository.findByEmailWithCompany(user.getEmail())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
    }
}
