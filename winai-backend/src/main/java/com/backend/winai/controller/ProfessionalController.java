package com.backend.winai.controller;

import com.backend.winai.dto.request.ProfessionalRequest;
import com.backend.winai.dto.response.ProfessionalResponse;
import com.backend.winai.entity.Professional.ProfessionalType;
import com.backend.winai.service.ProfessionalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/professionals")
@RequiredArgsConstructor
public class ProfessionalController {

    private final ProfessionalService professionalService;

    // Public endpoints for frontend
    @GetMapping("/designers")
    public ResponseEntity<List<ProfessionalResponse>> getDesigners() {
        return ResponseEntity.ok(professionalService.findActiveByType(ProfessionalType.DESIGNER));
    }

    @GetMapping("/editors")
    public ResponseEntity<List<ProfessionalResponse>> getEditors() {
        return ResponseEntity.ok(professionalService.findActiveByType(ProfessionalType.EDITOR));
    }

    // Admin endpoints
    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<ProfessionalResponse>> getAllAdmin(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        return ResponseEntity.ok(professionalService.findAll(page, size, sortBy, direction));
    }

    @GetMapping("/admin/type/{type}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<ProfessionalResponse>> getByTypeAdmin(
            @PathVariable ProfessionalType type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(professionalService.findByType(type, page, size));
    }

    @GetMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProfessionalResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(professionalService.findById(id));
    }

    @PostMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProfessionalResponse> create(@Valid @RequestBody ProfessionalRequest request) {
        return ResponseEntity.ok(professionalService.create(request));
    }

    @PutMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProfessionalResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody ProfessionalRequest request) {
        return ResponseEntity.ok(professionalService.update(id, request));
    }

    @DeleteMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        professionalService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/admin/{id}/toggle-active")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProfessionalResponse> toggleActive(@PathVariable UUID id) {
        return ResponseEntity.ok(professionalService.toggleActive(id));
    }
}
