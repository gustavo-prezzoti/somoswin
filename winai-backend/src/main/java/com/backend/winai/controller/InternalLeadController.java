package com.backend.winai.controller;

import com.backend.winai.entity.Lead;
import com.backend.winai.entity.LeadStatus;
import com.backend.winai.entity.WhatsAppMessage;
import com.backend.winai.repository.LeadRepository;
import com.backend.winai.repository.WhatsAppMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Controller interno para uso entre serviços (Lead Qualifier Python)
 * Autenticação via header X-Internal-Key
 */
@RestController
@RequestMapping("/api/internal/leads")
@RequiredArgsConstructor
@Slf4j
public class InternalLeadController {

    private final LeadRepository leadRepository;
    private final WhatsAppMessageRepository messageRepository;

    @Value("${internal.api.key:winai-internal-secret-key}")
    private String internalApiKey;

    /**
     * Lista todos os leads pendentes de qualificação automática
     * Retorna apenas leads onde manuallyQualified = false
     */
    @GetMapping("/pending-qualification")
    public ResponseEntity<?> getPendingLeads(@RequestHeader("X-Internal-Key") String apiKey) {
        if (!validateApiKey(apiKey)) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid API key"));
        }

        List<Lead> pendingLeads = leadRepository.findAll().stream()
                .filter(lead -> !Boolean.TRUE.equals(lead.getManuallyQualified()))
                .collect(Collectors.toList());

        List<Map<String, Object>> response = pendingLeads.stream().map(lead -> {
            Map<String, Object> leadData = new java.util.HashMap<>();
            leadData.put("id", lead.getId().toString());
            leadData.put("companyId", lead.getCompany().getId().toString());
            leadData.put("name", lead.getName());
            leadData.put("phone", lead.getPhone());
            leadData.put("email", lead.getEmail());
            leadData.put("status", lead.getStatus().name());
            leadData.put("notes", lead.getNotes());
            leadData.put("manuallyQualified", lead.getManuallyQualified());
            return leadData;
        }).collect(Collectors.toList());

        log.info("Returning {} leads pending qualification", response.size());
        return ResponseEntity.ok(response);
    }

    /**
     * Busca mensagens de um lead para análise
     */
    @GetMapping("/{leadId}/messages")
    public ResponseEntity<?> getLeadMessages(
            @RequestHeader("X-Internal-Key") String apiKey,
            @PathVariable UUID leadId,
            @RequestParam(defaultValue = "20") int limit) {

        if (!validateApiKey(apiKey)) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid API key"));
        }

        Lead lead = leadRepository.findById(leadId).orElse(null);
        if (lead == null) {
            return ResponseEntity.notFound().build();
        }

        // Buscar mensagens associadas ao lead
        List<WhatsAppMessage> messages = messageRepository.findByLeadId(leadId);

        // Limitar e mapear para resposta simples
        List<Map<String, Object>> response = messages.stream()
                .limit(limit)
                .map(msg -> {
                    Map<String, Object> msgData = new java.util.HashMap<>();
                    msgData.put("id", msg.getId().toString());
                    msgData.put("content", msg.getContent());
                    msgData.put("fromMe", msg.getFromMe());
                    msgData.put("timestamp", msg.getMessageTimestamp());
                    msgData.put("messageType", msg.getMessageType());
                    msgData.put("mediaType", msg.getMediaType());
                    msgData.put("mediaUrl", msg.getMediaUrl());
                    return msgData;
                }).collect(Collectors.toList());

        log.info("Returning {} messages for lead {}", response.size(), leadId);
        return ResponseEntity.ok(response);
    }

    /**
     * Atualiza o status de um lead (uso interno pelo qualifier)
     */
    @PutMapping("/{leadId}/qualify")
    public ResponseEntity<?> qualifyLead(
            @RequestHeader("X-Internal-Key") String apiKey,
            @PathVariable UUID leadId,
            @RequestBody Map<String, String> request) {

        if (!validateApiKey(apiKey)) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid API key"));
        }

        Lead lead = leadRepository.findById(leadId).orElse(null);
        if (lead == null) {
            return ResponseEntity.notFound().build();
        }

        // Verificar se é qualificação manual (não sobrescrever)
        if (Boolean.TRUE.equals(lead.getManuallyQualified())) {
            log.info("Lead {} is manually qualified, skipping AI update", leadId);
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "reason", "Lead is manually qualified"));
        }

        String newStatus = request.get("status");
        if (newStatus == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Status is required"));
        }

        try {
            LeadStatus status = LeadStatus.valueOf(newStatus.toUpperCase());
            lead.setStatus(status);
            leadRepository.save(lead);

            log.info("Lead {} qualified by AI to status: {}", leadId, status);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "leadId", leadId.toString(),
                    "newStatus", status.name()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid status: " + newStatus));
        }
    }

    private boolean validateApiKey(String apiKey) {
        return internalApiKey != null && internalApiKey.equals(apiKey);
    }
}
