package com.backend.winai.service;

import com.backend.winai.entity.GoogleDriveConnection;
import com.backend.winai.event.GoogleOAuthExpiredEvent;
import com.backend.winai.repository.GoogleDriveConnectionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Serviço para desconexão e notificação quando o token OAuth do Google expira.
 * Usa REQUIRES_NEW para garantir que a desconexão persista mesmo se a operação chamadora falhar.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class GoogleOAuthService {

    private final GoogleDriveConnectionRepository driveConnectionRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = false)
    public void markDisconnectedAndNotify(GoogleDriveConnection connection) {
        UUID companyId = connection.getCompany().getId();
        GoogleDriveConnection conn = driveConnectionRepository.findByCompanyId(companyId).orElse(null);
        if (conn == null) return;
        conn.setConnected(false);
        conn.setAccessToken(null);
        driveConnectionRepository.save(conn);
        log.info("Google OAuth disconnected for company {} due to token expiration", companyId);
        eventPublisher.publishEvent(new GoogleOAuthExpiredEvent(this, companyId));
    }
}
