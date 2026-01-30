package com.backend.winai.controller;

import com.backend.winai.dto.request.GlobalNotificationConfigRequest;
import com.backend.winai.entity.GlobalNotificationConfig;
import com.backend.winai.service.GlobalNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/global-notifications")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class GlobalNotificationController {

    private final GlobalNotificationService service;

    @GetMapping("/{companyId}")
    public ResponseEntity<GlobalNotificationConfig> getConfig(@PathVariable UUID companyId) {
        return ResponseEntity.ok(service.getConfig(companyId));
    }

    @PostMapping
    public ResponseEntity<GlobalNotificationConfig> saveConfig(@RequestBody GlobalNotificationConfigRequest request) {
        return ResponseEntity.ok(service.saveConfig(request));
    }
}
