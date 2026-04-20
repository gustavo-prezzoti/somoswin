package com.backend.winai.controller;

import com.backend.winai.dto.request.GlobalNotificationConfigRequest;
import com.backend.winai.dto.response.GlobalNotificationConfigResponse;
import com.backend.winai.service.GlobalNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/global-notifications")
@RequiredArgsConstructor
@PreAuthorize("@adminSecurity.canAccess(authentication, 'alertas')")
public class GlobalNotificationController {

    private final GlobalNotificationService service;

    @GetMapping("/{companyId}")
    public ResponseEntity<GlobalNotificationConfigResponse> getConfig(@PathVariable UUID companyId) {
        return ResponseEntity.ok(service.getConfig(companyId));
    }

    @PostMapping
    public ResponseEntity<GlobalNotificationConfigResponse> saveConfig(@RequestBody GlobalNotificationConfigRequest request) {
        return ResponseEntity.ok(service.saveConfig(request));
    }
}
