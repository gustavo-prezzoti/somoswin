package com.backend.winai.service;

import com.backend.winai.repository.GoogleDriveConnectionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Slf4j
@RequiredArgsConstructor
public class CalendarSyncScheduler {

    private final GoogleDriveConnectionRepository connectionRepository;
    private final GoogleDriveService googleDriveService;

    @Scheduled(fixedRate = 300000) // 5 minutes
    @Transactional(readOnly = true)
    public void syncAllCalendars() {
        connectionRepository.findAll().forEach(connection -> {
            if (connection.isConnected()) {
                try {
                    googleDriveService.performFullSync(connection.getCompany());
                } catch (Exception e) {
                    log.error("Failed to sync calendar for company {}", connection.getCompany().getId(), e);
                }
            }
        });
    }
}
