package com.backend.winai.controller;

import com.backend.winai.dto.request.GlobalNotificationConfigRequest;
import com.backend.winai.dto.response.GlobalNotificationConfigResponse;
import com.backend.winai.service.GlobalNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/global-notifications")
@RequiredArgsConstructor
public class GlobalNotificationController {

    private final GlobalNotificationService globalNotificationService;

    @GetMapping("/{companyId}")
    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'notificacoes_globais', 'read')")
    public ResponseEntity<GlobalNotificationConfigResponse> getConfig(@PathVariable UUID companyId) {
        GlobalNotificationConfigResponse body = globalNotificationService.getConfigResponse(companyId);
        return ResponseEntity.ok(body);
    }

    @PostMapping
    @PreAuthorize("@adminSecurity.hasPermission(authentication, 'notificacoes_globais', 'update')")
    public ResponseEntity<GlobalNotificationConfigResponse> saveConfig(
            @RequestBody GlobalNotificationConfigRequest request) {
        return ResponseEntity.ok(globalNotificationService.saveConfigResponse(request));
    }
}
