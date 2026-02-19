package com.backend.winai.controller;

import com.backend.winai.dto.response.NotificationResponse;
import com.backend.winai.entity.User;
import com.backend.winai.repository.UserRepository;
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
    private final UserRepository userRepository;

    private User getUserWithCompany(User user) {
        return userRepository.findByEmailWithCompany(user.getEmail())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
    }

    /**
     * Lista todas as notificações do usuário autenticado (filtradas por empresa)
     */
    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getNotifications(@AuthenticationPrincipal User user) {
        User userWithCompany = getUserWithCompany(user);
        List<NotificationResponse> notifications = notificationService.getUserNotifications(userWithCompany);
        return ResponseEntity.ok(notifications);
    }

    /**
     * Lista apenas notificações não lidas (filtradas por empresa)
     */
    @GetMapping("/unread")
    public ResponseEntity<List<NotificationResponse>> getUnreadNotifications(@AuthenticationPrincipal User user) {
        User userWithCompany = getUserWithCompany(user);
        List<NotificationResponse> notifications = notificationService.getUnreadNotifications(userWithCompany);
        return ResponseEntity.ok(notifications);
    }

    /**
     * Conta notificações não lidas (filtradas por empresa)
     */
    @GetMapping("/unread/count")
    public ResponseEntity<Long> getUnreadCount(@AuthenticationPrincipal User user) {
        User userWithCompany = getUserWithCompany(user);
        Long count = notificationService.getUnreadCount(userWithCompany);
        return ResponseEntity.ok(count);
    }

    /**
     * Marca uma notificação como lida
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markAsRead(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        User userWithCompany = getUserWithCompany(user);
        NotificationResponse notification = notificationService.markAsRead(id, userWithCompany);
        return ResponseEntity.ok(notification);
    }

    /**
     * Marca todas as notificações como lidas
     */
    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(@AuthenticationPrincipal User user) {
        User userWithCompany = getUserWithCompany(user);
        notificationService.markAllAsRead(userWithCompany);
        return ResponseEntity.ok().build();
    }

    /**
     * Deleta uma notificação
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {
        User userWithCompany = getUserWithCompany(user);
        notificationService.deleteNotification(id, userWithCompany);
        return ResponseEntity.ok().build();
    }
}

