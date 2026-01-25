package com.backend.winai.controller;

import com.backend.winai.dto.ChatRequest;
import com.backend.winai.dto.ChatResponse;
import com.backend.winai.entity.SupportConfig;
import com.backend.winai.service.SupportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/support")
@RequiredArgsConstructor
public class SupportController {

    private final SupportService supportService;

    @GetMapping("/config")
    public ResponseEntity<SupportConfig> getConfig() {
        return ResponseEntity.ok(supportService.getCurrentConfig());
    }

    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(@RequestBody ChatRequest request) {
        return ResponseEntity.ok(supportService.processChat(request));
    }
}
