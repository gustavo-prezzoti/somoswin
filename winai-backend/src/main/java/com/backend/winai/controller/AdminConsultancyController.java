package com.backend.winai.controller;

import com.backend.winai.dto.consultancy.*;
import com.backend.winai.service.ConsultancyService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/consultancy")
@RequiredArgsConstructor
@Tag(name = "Admin Consultoria", description = "Upload de gravações e transcrições (consultoria estratégica)")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
public class AdminConsultancyController {

    private final ConsultancyService consultancyService;

    @GetMapping("/companies/{companyId}/meetings")
    public ResponseEntity<List<ConsultancyHistoryRowDto>> listMeetings(@PathVariable UUID companyId) {
        return ResponseEntity.ok(consultancyService.adminListConsultancyMeetings(companyId));
    }

    @PostMapping(value = "/companies/{companyId}/meetings/{meetingId}/recording", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> uploadRecording(
            @PathVariable UUID companyId,
            @PathVariable UUID meetingId,
            @RequestPart("file") MultipartFile file) throws Exception {
        consultancyService.adminUploadRecording(companyId, meetingId, file);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/companies/{companyId}/meetings/{meetingId}/transcription")
    public ResponseEntity<ConsultancyMeetingDetailResponse> saveTranscription(
            @PathVariable UUID companyId,
            @PathVariable UUID meetingId,
            @Valid @RequestBody TranscriptionUpdateRequest body) {
        return ResponseEntity.ok(consultancyService.adminSaveTranscriptionAndSummarize(companyId, meetingId, body));
    }

    @PatchMapping("/companies/{companyId}/consultant-profile")
    public ResponseEntity<ConsultantProfileDto> patchConsultantProfile(
            @PathVariable UUID companyId,
            @RequestBody ConsultantProfilePatchRequest body) {
        return ResponseEntity.ok(consultancyService.adminPatchConsultantProfile(companyId, body));
    }
}
