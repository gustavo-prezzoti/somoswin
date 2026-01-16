package com.backend.winai.controller;

import com.backend.winai.dto.request.CreateKnowledgeBaseRequest;
import com.backend.winai.dto.request.LinkConnectionRequest;
import com.backend.winai.dto.request.UpdateKnowledgeBaseRequest;
import com.backend.winai.dto.response.KnowledgeBaseResponse;
import com.backend.winai.dto.response.UserWhatsAppConnectionResponse;
import com.backend.winai.entity.KnowledgeBase;
import com.backend.winai.entity.User;
import com.backend.winai.entity.UserWhatsAppConnection;
import com.backend.winai.service.KnowledgeBaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/knowledge-bases")
@RequiredArgsConstructor
public class KnowledgeBaseController {

    private final KnowledgeBaseService service;

    @GetMapping
    public ResponseEntity<List<KnowledgeBaseResponse>> findAll(@AuthenticationPrincipal User user) {
        List<KnowledgeBase> list = service.findAll(user);
        return ResponseEntity.ok(list.stream().map(this::toResponse).collect(Collectors.toList()));
    }

    @PostMapping
    public ResponseEntity<KnowledgeBaseResponse> create(@AuthenticationPrincipal User user,
            @RequestBody CreateKnowledgeBaseRequest request) {
        KnowledgeBase kb = service.create(user, request.getName(), request.getContent(), request.getAgentPrompt());
        return ResponseEntity.ok(toResponse(kb));
    }

    @PutMapping("/{id}")
    public ResponseEntity<KnowledgeBaseResponse> update(@AuthenticationPrincipal User user, @PathVariable UUID id,
            @RequestBody UpdateKnowledgeBaseRequest request) {
        KnowledgeBase kb = service.update(user, id, request.getName(), request.getContent(), request.getAgentPrompt(),
                request.getIsActive());
        return ResponseEntity.ok(toResponse(kb));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        service.delete(user, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/connections")
    public ResponseEntity<List<UserWhatsAppConnectionResponse>> getConnections(@AuthenticationPrincipal User user,
            @PathVariable UUID id) {
        List<UserWhatsAppConnection> connections = service.findConnections(user, id);

        List<UserWhatsAppConnectionResponse> responses = connections.stream()
                .map(this::toConnectionResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    @PostMapping("/{id}/connections")
    public ResponseEntity<Void> linkConnection(@AuthenticationPrincipal User user, @PathVariable UUID id,
            @RequestBody LinkConnectionRequest request) {
        service.linkConnection(user, id, request.getConnectionId());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/connections/{connectionId}")
    public ResponseEntity<Void> unlinkConnection(@AuthenticationPrincipal User user, @PathVariable UUID id,
            @PathVariable UUID connectionId) {
        service.unlinkConnection(user, id, connectionId);
        return ResponseEntity.noContent().build();
    }

    private KnowledgeBaseResponse toResponse(KnowledgeBase kb) {
        return KnowledgeBaseResponse.builder()
                .id(kb.getId())
                .name(kb.getName())
                .content(kb.getContent())
                .agentPrompt(kb.getAgentPrompt())
                .isActive(kb.getIsActive())
                .createdAt(kb.getCreatedAt())
                .updatedAt(kb.getUpdatedAt())
                .build();
    }

    private UserWhatsAppConnectionResponse toConnectionResponse(UserWhatsAppConnection conn) {
        return UserWhatsAppConnectionResponse.builder()
                .id(conn.getId())
                .companyId(conn.getCompany().getId())
                .companyName(conn.getCompany().getName())
                .createdByUserId(conn.getCreatedBy() != null ? conn.getCreatedBy().getId() : null)
                .createdByUserName(conn.getCreatedBy() != null ? conn.getCreatedBy().getName() : null)
                .instanceName(conn.getInstanceName())
                .instanceToken(conn.getInstanceToken())
                .instanceBaseUrl(conn.getInstanceBaseUrl())
                .description(conn.getDescription())
                .isActive(conn.getIsActive())
                .createdAt(conn.getCreatedAt())
                .updatedAt(conn.getUpdatedAt())
                .build();
    }
}
