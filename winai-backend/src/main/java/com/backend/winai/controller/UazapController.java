package com.backend.winai.controller;

import com.backend.winai.dto.request.CreateUazapInstanceRequest;
import com.backend.winai.dto.uazap.UazapInstanceDTO;
import com.backend.winai.service.UazapService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/uazap")
@RequiredArgsConstructor
@Tag(name = "Uazap", description = "Integração com API WhatsApp Uazap")
public class UazapController {

    private final UazapService uazapService;

    @Operation(summary = "Listar Instâncias", description = "Retorna a lista de instâncias disponíveis no UaZap")
    @GetMapping("/instances")
    public ResponseEntity<List<UazapInstanceDTO>> getInstances() {
        return ResponseEntity.ok(uazapService.fetchInstances());
    }

    @Operation(summary = "Criar Instância", description = "Cria uma nova instância no UaZap")
    @PostMapping("/instances")
    public ResponseEntity<Map<String, Object>> createInstance(@RequestBody CreateUazapInstanceRequest request) {
        return ResponseEntity.ok(uazapService.createInstance(request));
    }

    @Operation(summary = "Deletar Instância", description = "Deleta uma instância do UaZap")
    @DeleteMapping("/instances/{instanceName}")
    public ResponseEntity<Void> deleteInstance(
            @Parameter(description = "Nome da instância") @PathVariable String instanceName) {
        uazapService.deleteInstance(instanceName);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "Conectar Instância", description = "Conecta uma instância ao WhatsApp (gera QR code)")
    @PostMapping("/instances/{instanceName}/connect")
    public ResponseEntity<Map<String, Object>> connectInstance(
            @Parameter(description = "Nome da instância") @PathVariable String instanceName) {
        return ResponseEntity.ok(uazapService.connectInstance(instanceName));
    }

    @Operation(summary = "Desconectar Instância", description = "Desconecta uma instância do WhatsApp")
    @PostMapping("/instances/{instanceName}/disconnect")
    public ResponseEntity<Void> disconnectInstance(
            @Parameter(description = "Nome da instância") @PathVariable String instanceName) {
        uazapService.disconnectInstance(instanceName);
        return ResponseEntity.ok().build();
    }
}
