package com.backend.winai.service;

import com.backend.winai.dto.uazap.UazapInstanceDTO;
import com.backend.winai.dto.whatsapp.broadcast.CompanyWhatsAppInstanceCardResponse;
import com.backend.winai.entity.User;
import com.backend.winai.entity.UserWhatsAppConnection;
import com.backend.winai.repository.UserWhatsAppConnectionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Lista instâncias WhatsApp da empresa enriquecidas com status na API UaZap (sem métricas inventadas).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WhatsAppCompanyInstancesService {

    private final UserWhatsAppConnectionRepository connectionRepository;
    private final UazapService uazapService;

    @Value("${uazap.default-base-url}")
    private String defaultBaseUrl;

    @Transactional(readOnly = true)
    public List<CompanyWhatsAppInstanceCardResponse> listForUser(User user) {
        if (user.getCompany() == null) {
            throw new IllegalStateException("Usuário sem empresa");
        }
        UUID companyId = user.getCompany().getId();
        List<UserWhatsAppConnection> connections = connectionRepository.findByCompanyIdAndIsActiveTrue(companyId);
        List<CompanyWhatsAppInstanceCardResponse> out = new ArrayList<>();
        for (UserWhatsAppConnection conn : connections) {
            String base = conn.getInstanceBaseUrl() != null && !conn.getInstanceBaseUrl().isBlank()
                    ? conn.getInstanceBaseUrl().trim()
                    : defaultBaseUrl;
            UazapInstanceDTO match = null;
            try {
                List<UazapInstanceDTO> instances = uazapService.fetchInstances(base);
                match = findMatchingInstance(conn, instances);
            } catch (Exception e) {
                log.warn("[CompanyInstances] fetchInstances falhou para {}: {}", conn.getInstanceName(), e.getMessage());
            }
            out.add(toCard(conn, match));
        }
        return out;
    }

    private UazapInstanceDTO findMatchingInstance(UserWhatsAppConnection conn, List<UazapInstanceDTO> instances) {
        if (instances == null || instances.isEmpty()) {
            return null;
        }
        final String search = conn.getInstanceName() != null ? conn.getInstanceName().trim().toLowerCase() : "";
        UazapInstanceDTO exact = instances.stream()
                .filter(inst -> {
                    String name = inst.getInstanceName() != null ? inst.getInstanceName().trim().toLowerCase() : "";
                    String id = inst.getInstanceId() != null ? inst.getInstanceId().trim().toLowerCase() : "";
                    return name.equals(search) || id.equals(search);
                })
                .findFirst()
                .orElse(null);
        if (exact != null) {
            return exact;
        }
        return instances.stream()
                .filter(inst -> {
                    String name = inst.getInstanceName() != null ? inst.getInstanceName().trim().toLowerCase() : "";
                    String id = inst.getInstanceId() != null ? inst.getInstanceId().trim().toLowerCase() : "";
                    return !search.isEmpty()
                            && (name.contains(search) || id.contains(search) || search.contains(name));
                })
                .findFirst()
                .orElse(null);
    }

    private CompanyWhatsAppInstanceCardResponse toCard(UserWhatsAppConnection conn, UazapInstanceDTO api) {
        String phone = "—";
        if (api != null && api.getPhoneNumber() != null && !api.getPhoneNumber().isBlank()) {
            phone = api.getPhoneNumber().trim();
        }
        String profile = api != null ? api.getProfileName() : null;
        String uiStatus = mapUiStatus(api);
        String modeLabel = conn.getDescription() != null && !conn.getDescription().isBlank()
                ? conn.getDescription().trim()
                : "Instância WhatsApp";
        return CompanyWhatsAppInstanceCardResponse.builder()
                .connectionId(conn.getId())
                .instanceName(conn.getInstanceName())
                .phoneDisplay(phone)
                .profileName(profile)
                .status(uiStatus)
                .modeLabel(modeLabel)
                .messagesSent(null)
                .daysActive(null)
                .interactionsToday(null)
                .limitToday(null)
                .build();
    }

    /** ready | warming | paused | unknown */
    private static String mapUiStatus(UazapInstanceDTO api) {
        if (api == null || api.getStatus() == null || api.getStatus().isBlank()) {
            return "unknown";
        }
        String s = api.getStatus().trim().toLowerCase();
        if ("open".equals(s) || "connected".equals(s)) {
            return "ready";
        }
        if (s.contains("qr") || "connecting".equals(s) || "pairing".equals(s)) {
            return "warming";
        }
        if (s.contains("close") || "logout".equals(s) || "disconnected".equals(s)) {
            return "paused";
        }
        return "unknown";
    }
}
