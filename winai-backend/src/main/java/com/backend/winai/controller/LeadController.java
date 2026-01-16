package com.backend.winai.controller;

import com.backend.winai.dto.request.LeadRequest;
import com.backend.winai.dto.response.LeadResponse;
import com.backend.winai.dto.response.MessageResponse;
import com.backend.winai.entity.User;
import com.backend.winai.repository.UserRepository;
import com.backend.winai.service.LeadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/leads")
@RequiredArgsConstructor
public class LeadController {

    private final LeadService leadService;
    private final UserRepository userRepository;

    /**
     * GET /api/v1/leads
     * Lista todos os leads da empresa
     */
    @GetMapping
    public ResponseEntity<List<LeadResponse>> getAllLeads(@AuthenticationPrincipal User user) {
        User userWithCompany = getUserWithCompany(user);
        if (userWithCompany.getCompany() == null) {
            return ResponseEntity.ok(List.of());
        }
        List<LeadResponse> leads = leadService.getAllLeads(userWithCompany.getCompany());
        return ResponseEntity.ok(leads);
    }

    /**
     * GET /api/v1/leads/paged
     * Lista leads paginados
     */
    @GetMapping("/paged")
    public ResponseEntity<Page<LeadResponse>> getLeadsPaged(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        User userWithCompany = getUserWithCompany(user);
        if (userWithCompany.getCompany() == null) {
            return ResponseEntity.ok(Page.empty());
        }
        Page<LeadResponse> leads = leadService.getLeadsPaged(userWithCompany.getCompany(), page, size);
        return ResponseEntity.ok(leads);
    }

    /**
     * GET /api/v1/leads/search
     * Busca leads por termo
     */
    @GetMapping("/search")
    public ResponseEntity<Page<LeadResponse>> searchLeads(
            @AuthenticationPrincipal User user,
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        User userWithCompany = getUserWithCompany(user);
        if (userWithCompany.getCompany() == null) {
            return ResponseEntity.ok(Page.empty());
        }
        Page<LeadResponse> leads = leadService.searchLeads(userWithCompany.getCompany(), q, page, size);
        return ResponseEntity.ok(leads);
    }

    /**
     * GET /api/v1/leads/{id}
     * Busca lead por ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<LeadResponse> getLeadById(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        User userWithCompany = getUserWithCompany(user);
        LeadResponse lead = leadService.getLeadById(userWithCompany.getCompany(), id);
        return ResponseEntity.ok(lead);
    }

    /**
     * POST /api/v1/leads
     * Cria um novo lead
     */
    @PostMapping
    public ResponseEntity<LeadResponse> createLead(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody LeadRequest request) {
        User userWithCompany = getUserWithCompany(user);
        if (userWithCompany.getCompany() == null) {
            throw new RuntimeException("Usuário não possui empresa associada");
        }
        LeadResponse lead = leadService.createLead(userWithCompany.getCompany(), request);
        return ResponseEntity.ok(lead);
    }

    /**
     * PUT /api/v1/leads/{id}
     * Atualiza um lead
     */
    @PutMapping("/{id}")
    public ResponseEntity<LeadResponse> updateLead(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id,
            @Valid @RequestBody LeadRequest request) {
        User userWithCompany = getUserWithCompany(user);
        LeadResponse lead = leadService.updateLead(userWithCompany.getCompany(), id, request);
        return ResponseEntity.ok(lead);
    }

    /**
     * DELETE /api/v1/leads/{id}
     * Deleta um lead
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponse> deleteLead(
            @AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        User userWithCompany = getUserWithCompany(user);
        leadService.deleteLead(userWithCompany.getCompany(), id);
        return ResponseEntity.ok(MessageResponse.success("Lead removido com sucesso"));
    }

    private User getUserWithCompany(User user) {
        return userRepository.findByEmailWithCompany(user.getEmail())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
    }
}
