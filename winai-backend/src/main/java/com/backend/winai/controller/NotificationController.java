package com.backend.winai.controller;

import com.backend.winai.dto.response.NotificationResponse;
import com.backend.winai.entity.User;
import com.backend.winai.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * Lista todas as notificações do usuário autenticado
     */
    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getNotifications(@AuthenticationPrincipal User user) {
        List<NotificationResponse> notifications = notificationService.getUserNotifications(user);
        return ResponseEntity.ok(notifications);
    }

    /**
     * Lista apenas notificações não lidas
     */
    @GetMapping("/unread")
    public ResponseEntity<List<NotificationResponse>> getUnreadNotifications(@AuthenticationPrincipal User user) {
        List<NotificationResponse> notifications = notificationService.getUnreadNotifications(user);
        return ResponseEntity.ok(notifications);
    }

    /**
     * Conta notificações não lidas
     */
    @GetMapping("/unread/count")
    public ResponseEntity<Long> getUnreadCount(@AuthenticationPrincipal User user) {
        Long count = notificationService.getUnreadCount(user);
        return ResponseEntity.ok(count);
    }

    /**
     * Marca uma notificação como lida
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markAsRead(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        NotificationResponse notification = notificationService.markAsRead(id, user);
        return ResponseEntity.ok(notification);
    }

    /**
     * Marca todas as notificações como lidas
     */
    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(@AuthenticationPrincipal User user) {
        notificationService.markAllAsRead(user);
        return ResponseEntity.ok().build();
    }

    /**
     * Deleta uma notificação
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        notificationService.deleteNotification(id, user);
        return ResponseEntity.ok().build();
    }
}

