package com.backend.winai.controller;

import com.backend.winai.dto.googledrive.DriveConnectionStatusDTO;
import com.backend.winai.dto.googledrive.DriveFileDTO;
import com.backend.winai.entity.User;
import com.backend.winai.service.GoogleDriveService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/drive")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class GoogleDriveController {

    private final GoogleDriveService googleDriveService;

    /**
     * Get connection status
     */
    @GetMapping("/status")
    public ResponseEntity<DriveConnectionStatusDTO> getStatus(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(googleDriveService.getConnectionStatus(user));
    }

    /**
     * Get authorization URL to connect Google Drive
     */
    @GetMapping("/authorize")
    public ResponseEntity<?> authorize(@AuthenticationPrincipal User user) {
        try {
            String authUrl = googleDriveService.getAuthorizationUrl(user);
            return ResponseEntity.ok(Map.of("authUrl", authUrl));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage(), "success", false));
        }
    }

    /**
     * OAuth callback from Google
     */
    @GetMapping("/callback")
    public ResponseEntity<Void> callback(
            @RequestParam("code") String code,
            @RequestParam("state") String state) {
        String redirectUrl = googleDriveService.handleCallback(code, state);
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(redirectUrl))
                .build();
    }

    /**
     * List files from a folder
     */
    @GetMapping("/files")
    public ResponseEntity<List<DriveFileDTO>> listFiles(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false, defaultValue = "root") String folderId) {
        return ResponseEntity.ok(googleDriveService.listFiles(user, folderId));
    }

    /**
     * Disconnect Google Drive
     */
    @DeleteMapping("/disconnect")
    public ResponseEntity<Void> disconnect(@AuthenticationPrincipal User user) {
        googleDriveService.disconnect(user);
        return ResponseEntity.ok().build();
    }
}
