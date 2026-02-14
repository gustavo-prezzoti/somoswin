package com.backend.winai.controller;

import com.backend.winai.dto.agendamento.AgendamentoConfigDTO;
import com.backend.winai.entity.User;
import com.backend.winai.service.AgendamentoService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/agendamento")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AgendamentoController {

    private final AgendamentoService agendamentoService;

    @GetMapping("/config")
    public ResponseEntity<AgendamentoConfigDTO> getConfig(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(agendamentoService.getConfig(user));
    }

    @PutMapping("/config")
    public ResponseEntity<AgendamentoConfigDTO> updateConfig(@AuthenticationPrincipal User user,
            @RequestBody AgendamentoConfigDTO dto) {
        return ResponseEntity.ok(agendamentoService.updateConfig(user, dto));
    }

    @GetMapping("/slots")
    public ResponseEntity<List<String>> getSlots(
            @AuthenticationPrincipal User user,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(defaultValue = "1") int days) {
        List<String> slots = agendamentoService.getAvailableSlotsForDays(user.getCompany(), date, days);
        return ResponseEntity.ok(slots);
    }
}
