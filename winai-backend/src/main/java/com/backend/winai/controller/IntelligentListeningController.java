package com.backend.winai.controller;

import com.backend.winai.dto.request.IntelligentListeningStartRequest;
import com.backend.winai.dto.request.IntelligentListeningTranscriptRequest;
import com.backend.winai.dto.response.IntelligentListeningSessionResponse;
import com.backend.winai.entity.User;
import com.backend.winai.repository.UserRepository;
import com.backend.winai.service.IntelligentListeningService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/intelligent-listening")
@RequiredArgsConstructor
public class IntelligentListeningController {

    private final IntelligentListeningService intelligentListeningService;
    private final UserRepository userRepository;

    @PostMapping("/sessions")
    public ResponseEntity<IntelligentListeningSessionResponse> startSession(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody IntelligentListeningStartRequest request) {
        var u = getUserWithCompany(user);
        if (u.getCompany() == null) {
            throw new RuntimeException("Usuário não possui empresa associada");
        }
        return ResponseEntity.ok(intelligentListeningService.startSession(u.getCompany(), request));
    }

    @GetMapping("/by-lead/{leadId}")
    public ResponseEntity<List<IntelligentListeningSessionResponse>> listByLead(
            @AuthenticationPrincipal User user,
            @PathVariable UUID leadId) {
        var u = getUserWithCompany(user);
        if (u.getCompany() == null) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(intelligentListeningService.listByLead(u.getCompany(), leadId));
    }

    @GetMapping("/sessions/{id}")
    public ResponseEntity<IntelligentListeningSessionResponse> getSession(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        var u = getUserWithCompany(user);
        return ResponseEntity.ok(intelligentListeningService.getSession(u.getCompany(), id));
    }

    @PatchMapping("/sessions/{id}/transcription")
    public ResponseEntity<IntelligentListeningSessionResponse> patchTranscription(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @RequestBody IntelligentListeningTranscriptRequest body) {
        var u = getUserWithCompany(user);
        return ResponseEntity.ok(intelligentListeningService.patchTranscription(u.getCompany(), id, body));
    }

    @PostMapping(value = "/sessions/{id}/audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<IntelligentListeningSessionResponse> uploadAudio(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @RequestPart("file") MultipartFile file) {
        var u = getUserWithCompany(user);
        return ResponseEntity.ok(intelligentListeningService.uploadAndTranscribe(u.getCompany(), id, file));
    }

    @PostMapping("/sessions/{id}/analyze")
    public ResponseEntity<IntelligentListeningSessionResponse> analyze(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        var u = getUserWithCompany(user);
        return ResponseEntity.ok(intelligentListeningService.analyze(u.getCompany(), id));
    }

    @PostMapping("/sessions/{id}/complete")
    public ResponseEntity<IntelligentListeningSessionResponse> complete(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        var u = getUserWithCompany(user);
        return ResponseEntity.ok(intelligentListeningService.completeToCrm(u.getCompany(), id));
    }

    private User getUserWithCompany(User user) {
        return userRepository.findByEmailWithCompany(user.getEmail())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
    }
}
