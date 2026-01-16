package com.backend.winai.service;

import com.backend.winai.dto.request.CreateNotificationRequest;
import com.backend.winai.dto.response.NotificationResponse;
import com.backend.winai.entity.Notification;
import com.backend.winai.entity.User;
import com.backend.winai.repository.NotificationRepository;
import com.backend.winai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    /**
     * Cria uma nova notificação
     */
    @Transactional
    public NotificationResponse createNotification(CreateNotificationRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        Notification notification = Notification.builder()
                .user(user)
                .title(request.getTitle())
                .message(request.getMessage())
                .type(request.getType())
                .relatedEntityType(request.getRelatedEntityType())
                .relatedEntityId(request.getRelatedEntityId())
                .actionUrl(request.getActionUrl())
                .read(false)
                .build();

        notification = notificationRepository.save(notification);
        return toResponse(notification);
    }

    /**
     * Lista todas as notificações do usuário
     */
    @Transactional(readOnly = true)
    public List<NotificationResponse> getUserNotifications(User user) {
        List<Notification> notifications = notificationRepository.findByUserOrderByCreatedAtDesc(user);
        return notifications.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lista apenas notificações não lidas
     */
    @Transactional(readOnly = true)
    public List<NotificationResponse> getUnreadNotifications(User user) {
        List<Notification> notifications = notificationRepository.findByUserAndReadOrderByCreatedAtDesc(user, false);
        return notifications.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Conta notificações não lidas
     */
    @Transactional(readOnly = true)
    public Long getUnreadCount(User user) {
        return notificationRepository.countUnreadByUser(user);
    }

    /**
     * Marca uma notificação como lida
     */
    @Transactional
    public NotificationResponse markAsRead(UUID notificationId, User user) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notificação não encontrada"));

        if (!notification.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Notificação não pertence ao usuário");
        }

        notification.setRead(true);
        notification = notificationRepository.save(notification);
        return toResponse(notification);
    }

    /**
     * Marca todas as notificações como lidas
     */
    @Transactional
    public void markAllAsRead(User user) {
        notificationRepository.markAllAsReadByUser(user);
    }

    /**
     * Deleta uma notificação
     */
    @Transactional
    public void deleteNotification(UUID notificationId, User user) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notificação não encontrada"));

        if (!notification.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Notificação não pertence ao usuário");
        }

        notificationRepository.delete(notification);
    }

    /**
     * Converte entidade para DTO
     */
    private NotificationResponse toResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .read(notification.getRead())
                .type(notification.getType())
                .relatedEntityType(notification.getRelatedEntityType())
                .relatedEntityId(notification.getRelatedEntityId())
                .actionUrl(notification.getActionUrl())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}

