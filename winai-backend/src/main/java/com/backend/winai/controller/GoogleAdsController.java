package com.backend.winai.controller;

import com.backend.winai.entity.User;
import com.backend.winai.service.GoogleAdsOAuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/google-ads")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class GoogleAdsController {

    private final GoogleAdsOAuthService googleAdsOAuthService;

    @GetMapping("/auth")
    public ResponseEntity<Map<String, String>> getAuthUrl(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(Map.of("url", googleAdsOAuthService.getAuthorizationUrl(user)));
    }

    @GetMapping("/callback")
    public ResponseEntity<Void> callback(
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "state", required = false) String state,
            @RequestParam(value = "error", required = false) String error) {
        if (error != null || code == null) {
            return ResponseEntity.status(302)
                    .header("Location", googleAdsOAuthService.getErrorRedirectUrl())
                    .build();
        }
        String redirect = googleAdsOAuthService.handleCallback(code, state);
        return ResponseEntity.status(302).header("Location", redirect).build();
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(googleAdsOAuthService.getStatus(user));
    }

    @PostMapping("/disconnect")
    public ResponseEntity<Void> disconnect(@AuthenticationPrincipal User user) {
        googleAdsOAuthService.disconnect(user);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/customer-ids")
    public ResponseEntity<Void> updateCustomerIds(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) String customerId,
            @RequestParam(required = false) String loginCustomerId) {
        googleAdsOAuthService.updateCustomerIds(user, customerId, loginCustomerId);
        return ResponseEntity.ok().build();
    }
}
