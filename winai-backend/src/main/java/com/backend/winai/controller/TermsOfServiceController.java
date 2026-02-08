package com.backend.winai.controller;

import com.backend.winai.dto.response.TermsOfServiceResponse;
import com.backend.winai.entity.User;
import com.backend.winai.service.TermsOfServiceService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/terms")
@RequiredArgsConstructor
@Slf4j
public class TermsOfServiceController {

    private final TermsOfServiceService termsService;

    @GetMapping("/current")
    public ResponseEntity<TermsOfServiceResponse> getCurrentTerms() {
        return termsService.getActiveTerms()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getAcceptanceStatus(
            @AuthenticationPrincipal User user) {

        Map<String, Object> response = termsService.getAcceptanceStatus(user.getId());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/accept")
    public ResponseEntity<Map<String, Object>> acceptTerms(
            @AuthenticationPrincipal User user,
            HttpServletRequest request) {

        String ipAddress = getClientIpAddress(request);
        String userAgent = request.getHeader("User-Agent");

        termsService.acceptTerms(user.getId(), ipAddress, userAgent);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Termos aceitos com sucesso");

        return ResponseEntity.ok(response);
    }

    private String getClientIpAddress(HttpServletRequest request) {
        String[] headers = {
                "X-Forwarded-For",
                "Proxy-Client-IP",
                "WL-Proxy-Client-IP",
                "HTTP_X_FORWARDED_FOR",
                "HTTP_X_FORWARDED",
                "HTTP_FORWARDED_FOR",
                "HTTP_FORWARDED",
                "HTTP_CLIENT_IP",
                "HTTP_VIA",
                "REMOTE_ADDR"
        };

        for (String header : headers) {
            String ip = request.getHeader(header);
            if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
                return ip.split(",")[0].trim();
            }
        }

        return request.getRemoteAddr();
    }
}
