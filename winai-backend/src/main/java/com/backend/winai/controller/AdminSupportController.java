package com.backend.winai.controller;

import com.backend.winai.entity.SupportConfig;
import com.backend.winai.service.SupportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/support")
@RequiredArgsConstructor
public class AdminSupportController {

    private final SupportService supportService;

    @GetMapping("/config")
    public ResponseEntity<SupportConfig> getConfig() {
        return ResponseEntity.ok(supportService.getCurrentConfig());
    }

    @PutMapping("/config")
    public ResponseEntity<SupportConfig> updateConfig(@RequestBody SupportConfig config) {
        return ResponseEntity.ok(supportService.updateConfig(config));
    }
}
