package com.backend.winai.controller;

import com.backend.winai.dto.social.*;
import com.backend.winai.dto.social.ChatMessageDTO;
import com.backend.winai.entity.User;
import com.backend.winai.service.SocialGrowthChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/social/chat")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SocialGrowthChatController {

    private final SocialGrowthChatService chatService;

    @GetMapping
    public ResponseEntity<List<SocialChatResponse>> listChats(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(chatService.listChats(user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SocialChatDetailResponse> getChatDetails(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(chatService.getChatDetails(id, user));
    }

    @PostMapping("/send")
    public ResponseEntity<SendMessageResponse> sendMessage(
            @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(chatService.sendMessage(request, user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteChat(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        chatService.deleteChat(id, user);
        return ResponseEntity.ok().build();
    }
}
