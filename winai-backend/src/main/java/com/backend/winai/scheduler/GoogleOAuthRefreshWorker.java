package com.backend.winai.scheduler;

import com.backend.winai.entity.GoogleDriveConnection;
import com.backend.winai.repository.GoogleDriveConnectionRepository;
import com.backend.winai.service.GoogleDriveService;
import com.backend.winai.service.GoogleOAuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.List;

/**
 * Worker que renova tokens OAuth do Google Calendar.
 * Doc Google: access token expira em 3600s (1h). Roda a cada 30 min para renovar antes de expirar.
 * https://developers.google.com/identity/protocols/oauth2/web-server
 */
@Component
@Slf4j
@RequiredArgsConstructor
@Profile("google-oauth-worker")
public class GoogleOAuthRefreshWorker {

    private final GoogleDriveConnectionRepository connectionRepository;
    private final GoogleDriveService googleDriveService;
    private final GoogleOAuthService googleOAuthService;

    /** A cada 30 min (access token dura 1h - doc Google). Cron: seg min hora dia mês dia-semana */
    @Scheduled(cron = "0 */30 * * * *")
    @Transactional(readOnly = true)
    public void refreshExpiringTokens() {
        log.info("[GoogleOAuthRefresh] Iniciando renovação de tokens OAuth (access token: 1h)");

        List<GoogleDriveConnection> connections = connectionRepository.findAll();
        int refreshed = 0;
        int disconnected = 0;
        ZonedDateTime now = ZonedDateTime.now();
        ZonedDateTime threshold = now.plusMinutes(10); // Renovar se expira em até 10 min

        for (GoogleDriveConnection conn : connections) {
            if (!conn.isConnected()) continue;

            String refreshToken = conn.getRefreshToken();
            if (refreshToken == null || refreshToken.trim().isEmpty()) {
                log.warn("[GoogleOAuthRefresh] Empresa {} sem refresh_token - reconexão manual necessária",
                        conn.getCompany().getId());
                continue;
            }

            ZonedDateTime expiresAt = conn.getTokenExpiresAt();
            if (expiresAt == null) continue;

            // Renovar se expira em até 10 min (access token dura 1h)
            if (!expiresAt.isBefore(threshold)) {
                continue; // Token ainda válido por mais de 10 min
            }

            try {
                boolean success = googleDriveService.refreshTokenIfNeeded(conn);
                if (success) {
                    refreshed++;
                    log.info("[GoogleOAuthRefresh] Token renovado para empresa {}", conn.getCompany().getId());
                }
            } catch (Exception e) {
                log.error("[GoogleOAuthRefresh] Falha ao renovar token para empresa {}: {}",
                        conn.getCompany().getId(), e.getMessage());
                if (expiresAt.isBefore(ZonedDateTime.now())) {
                    try {
                        googleOAuthService.markDisconnectedAndNotify(conn);
                        disconnected++;
                    } catch (Exception ex) {
                        log.error("[GoogleOAuthRefresh] Erro ao desconectar empresa {}: {}", conn.getCompany().getId(), ex.getMessage());
                    }
                }
            }
        }

        log.info("[GoogleOAuthRefresh] Concluído: {} renovados, {} desconectados", refreshed, disconnected);
    }
}
