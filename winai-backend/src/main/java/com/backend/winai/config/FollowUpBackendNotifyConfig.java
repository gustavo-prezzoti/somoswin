package com.backend.winai.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.UUID;

/**
 * Cliente para o follow-up worker notificar o backend e enviar WebSocket aos usuários.
 * Só ativo quando followup.worker.enabled=true e backend.url está definido.
 */
@Configuration
@ConditionalOnProperty(name = "followup.worker.enabled", havingValue = "true")
public class FollowUpBackendNotifyConfig {

    @Bean
    @ConditionalOnProperty(name = "backend.url")
    public BackendNotifyClient backendNotifyClient(
            RestTemplate restTemplate,
            @Value("${backend.url}") String backendUrl,
            @Value("${internal.api.key:winai-lq-f8a9b2c7e4d1-2026-xK9mN3pL}") String internalApiKey) {
        return new BackendNotifyClient(restTemplate, backendUrl, internalApiKey);
    }

    public static class BackendNotifyClient {
        private final RestTemplate restTemplate;
        private final String backendUrl;
        private final String internalApiKey;

        public BackendNotifyClient(RestTemplate restTemplate, String backendUrl, String internalApiKey) {
            this.restTemplate = restTemplate;
            this.backendUrl = backendUrl.replaceAll("/$", "");
            this.internalApiKey = internalApiKey;
        }

        public void notifyNewMessage(UUID conversationId, UUID companyId) {
            try {
                String url = backendUrl + "/api/internal/whatsapp/notify-new-message";
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.set("X-Internal-Key", internalApiKey);
                Map<String, String> body = Map.of(
                        "conversationId", conversationId.toString(),
                        "companyId", companyId.toString());
                HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);
                ResponseEntity<?> response = restTemplate.postForEntity(url, request, Map.class);
                if (!response.getStatusCode().is2xxSuccessful()) {
                    org.slf4j.LoggerFactory.getLogger(BackendNotifyClient.class)
                            .warn("Backend notify returned {} for conversation {}", response.getStatusCode(), conversationId);
                }
            } catch (Exception e) {
                org.slf4j.LoggerFactory.getLogger(BackendNotifyClient.class)
                        .warn("Failed to notify backend for new message {}: {}", conversationId, e.getMessage());
            }
        }

        /**
         * Persiste a mensagem no backend (banco) e dispara WebSocket. Usar após enviar no Uazap.
         */
        public void persistAndNotify(UUID conversationId, UUID companyId, String content) {
            if (content == null || content.isBlank()) return;
            try {
                String url = backendUrl + "/api/internal/whatsapp/persist-and-notify-message";
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.set("X-Internal-Key", internalApiKey);
                Map<String, String> body = Map.of(
                        "conversationId", conversationId.toString(),
                        "companyId", companyId.toString(),
                        "content", content);
                HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);
                ResponseEntity<?> response = restTemplate.postForEntity(url, request, Map.class);
                if (!response.getStatusCode().is2xxSuccessful()) {
                    org.slf4j.LoggerFactory.getLogger(BackendNotifyClient.class)
                            .warn("Backend persist-and-notify returned {} for conversation {}", response.getStatusCode(), conversationId);
                }
            } catch (Exception e) {
                org.slf4j.LoggerFactory.getLogger(BackendNotifyClient.class)
                        .warn("Failed to persist-and-notify backend for conversation {}: {}", conversationId, e.getMessage());
            }
        }
    }
}
