package com.backend.winai.event;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.Notification;
import com.backend.winai.entity.User;
import com.backend.winai.repository.NotificationRepository;
import com.backend.winai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Cria notificações e envia WebSocket quando o token OAuth do Google expira.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class GoogleOAuthExpiredListener {

    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @EventListener
    @Transactional
    public void onGoogleOAuthExpired(GoogleOAuthExpiredEvent event) {
        var companyId = event.getCompanyId();
        List<User> users = userRepository.findByCompanyId(companyId);
        if (users.isEmpty()) {
            log.warn("No users found for company {} to notify about Google OAuth expiration", companyId);
            return;
        }

        String title = "Google Calendar desconectado";
        String message = "O token de acesso ao Google Calendar expirou. Reconecte em Configurações > Conexões Neurais para reativar o agendamento automático.";

        for (User user : users) {
            Notification notification = Notification.builder()
                    .user(user)
                    .company(Company.builder().id(companyId).build())
                    .title(title)
                    .message(message)
                    .read(false)
                    .type("WARNING")
                    .relatedEntityType("GOOGLE_OAUTH")
                    .actionUrl("/configuracoes")
                    .build();
            notificationRepository.save(notification);
        }

        var wsMessage = com.backend.winai.dto.response.WebSocketMessage.builder()
                .type("NOTIFICATION_RECEIVED")
                .companyId(companyId)
                .build();
        messagingTemplate.convertAndSend("/topic/whatsapp/" + companyId, wsMessage);

        log.info("Notified {} users of company {} about Google OAuth expiration", users.size(), companyId);
    }
}
