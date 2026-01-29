package com.backend.winai.controller;

import com.backend.winai.dto.request.FollowUpConfigRequest;
import com.backend.winai.dto.response.FollowUpConfigResponse;
import com.backend.winai.dto.response.FollowUpStatusResponse;
import com.backend.winai.service.FollowUpService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Controller para gerenciamento de follow-up automático.
 * Acesso restrito a administradores.
 */
@RestController
@RequestMapping("/api/v1/admin/followup")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN')")
public class FollowUpController {

    private final FollowUpService followUpService;

    // ========== CONFIGURAÇÃO ==========

    /**
     * Busca configuração de follow-up de uma empresa.
     */
    @GetMapping("/config/{companyId}")
    public ResponseEntity<FollowUpConfigResponse> getConfig(@PathVariable UUID companyId) {
        return followUpService.getConfigByCompany(companyId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Cria ou atualiza configuração de follow-up.
     */
    @PostMapping("/config")
    public ResponseEntity<FollowUpConfigResponse> saveConfig(@RequestBody FollowUpConfigRequest request) {
        log.info("Salvando configuração de follow-up para empresa {}", request.getCompanyId());
        FollowUpConfigResponse response = followUpService.saveConfig(request);
        return ResponseEntity.ok(response);
    }

    // ========== STATUS ==========

    /**
     * Lista status de follow-up de uma empresa.
     */
    @GetMapping("/status/{companyId}")
    public ResponseEntity<List<FollowUpStatusResponse>> getStatuses(@PathVariable UUID companyId) {
        List<FollowUpStatusResponse> statuses = followUpService.getStatusesByCompany(companyId);
        return ResponseEntity.ok(statuses);
    }

    /**
     * Pausa follow-up para uma conversa.
     */
    @PutMapping("/status/{conversationId}/pause")
    public ResponseEntity<Void> pauseFollowUp(@PathVariable UUID conversationId) {
        log.info("Pausando follow-up para conversa {}", conversationId);
        followUpService.pauseFollowUp(conversationId);
        return ResponseEntity.ok().build();
    }

    /**
     * Resume follow-up para uma conversa.
     */
    @PutMapping("/status/{conversationId}/resume")
    public ResponseEntity<Void> resumeFollowUp(@PathVariable UUID conversationId) {
        log.info("Resumindo follow-up para conversa {}", conversationId);
        followUpService.resumeFollowUp(conversationId);
        return ResponseEntity.ok().build();
    }

    /**
     * Reseta status de follow-up para uma conversa.
     */
    @DeleteMapping("/status/{conversationId}")
    public ResponseEntity<Void> resetFollowUp(@PathVariable UUID conversationId) {
        log.info("Resetando follow-up para conversa {}", conversationId);
        followUpService.resetFollowUp(conversationId);
        return ResponseEntity.ok().build();
    }
}
