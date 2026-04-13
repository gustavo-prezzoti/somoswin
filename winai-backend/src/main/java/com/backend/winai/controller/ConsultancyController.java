package com.backend.winai.controller;

import com.backend.winai.dto.consultancy.ConsultancyDashboardResponse;
import com.backend.winai.dto.consultancy.ConsultancyMeetingDetailResponse;
import com.backend.winai.dto.consultancy.CreateConsultancyCallRequestDto;
import com.backend.winai.entity.User;
import com.backend.winai.service.ConsultancyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/consultancy")
@RequiredArgsConstructor
public class ConsultancyController {

    private final ConsultancyService consultancyService;

    @GetMapping("/dashboard")
    public ResponseEntity<ConsultancyDashboardResponse> dashboard(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(consultancyService.getDashboard(user));
    }

    @PostMapping("/requests")
    public ResponseEntity<Void> createRequest(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody CreateConsultancyCallRequestDto body) {
        consultancyService.createCallRequest(user, body);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/meetings/{id}")
    public ResponseEntity<ConsultancyMeetingDetailResponse> meetingDetail(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        return ResponseEntity.ok(consultancyService.getMeetingDetail(user, id));
    }
}
