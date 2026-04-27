package com.backend.winai.controller;

import com.backend.winai.dto.request.StrategicActivityDescriptionRequest;
import com.backend.winai.dto.request.StrategicDiagnosisDraftRequest;
import com.backend.winai.dto.response.StrategicDiagnosisAdminResponse;
import com.backend.winai.entity.User;
import com.backend.winai.service.StrategicDiagnosisService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/companies/{companyId}/strategic-diagnosis")
@RequiredArgsConstructor
public class AdminStrategicDiagnosisController {

    private final StrategicDiagnosisService strategicDiagnosisService;

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'metas', 'read')")
    @Operation(summary = "Diagnóstico estratégico — obter rascunho e publicado")
    @GetMapping
    public ResponseEntity<StrategicDiagnosisAdminResponse> get(
            @PathVariable UUID companyId) {
        return ResponseEntity.ok(strategicDiagnosisService.getForAdmin(companyId));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'metas', 'update')")
    @Operation(summary = "Diagnóstico estratégico — salvar rascunho")
    @PutMapping
    public ResponseEntity<StrategicDiagnosisAdminResponse> saveDraft(
            @AuthenticationPrincipal User user,
            @PathVariable UUID companyId,
            @Valid @RequestBody StrategicDiagnosisDraftRequest body) {
        return ResponseEntity.ok(strategicDiagnosisService.saveDraft(companyId, user, body));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'metas', 'update')")
    @Operation(summary = "Diagnóstico estratégico — publicar para o app do cliente")
    @PostMapping("/publish")
    public ResponseEntity<StrategicDiagnosisAdminResponse> publish(
            @AuthenticationPrincipal User user,
            @PathVariable UUID companyId) {
        return ResponseEntity.ok(strategicDiagnosisService.publish(companyId, user));
    }

    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'metas', 'update')")
    @Operation(summary = "Diagnóstico estratégico — gerar descrição curta (IA)")
    @PostMapping("/generate-activity-description")
    public ResponseEntity<Map<String, String>> generateDescription(
            @Valid @RequestBody StrategicActivityDescriptionRequest body) {
        String text = strategicDiagnosisService.generateActivityDescription(body.getTitle());
        return ResponseEntity.ok(Map.of("description", text));
    }
}
