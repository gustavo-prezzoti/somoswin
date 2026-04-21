package com.backend.winai.service;

import com.backend.winai.dto.uazap.UazapInstanceDTO;
import com.backend.winai.dto.whatsapp.broadcast.CompanyWhatsAppInstanceCardResponse;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.User;
import com.backend.winai.entity.UserWhatsAppConnection;
import com.backend.winai.repository.CompanyRepository;
import com.backend.winai.repository.UserWhatsAppConnectionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Lista instâncias WhatsApp da empresa enriquecidas com status na API UaZap (sem métricas inventadas).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WhatsAppCompanyInstancesService {

    private final CompanyRepository companyRepository;
    private final UserWhatsAppConnectionRepository connectionRepository;
    private final UazapService uazapService;

    @Value("${uazap.default-base-url}")
    private String defaultBaseUrl;

    private static final int MIN_WHATSAPP_DIGITS = 10;

    /**
     * Número para wa.me na landing pública (/w): perfil da empresa ou primeira instância UAZAP ativa com número na API.
     */
    @Transactional(readOnly = true)
    public Optional<String> resolvePrimaryPhoneDigitsForCompany(UUID companyId) {
        Optional<Company> companyOpt = companyRepository.findById(companyId);
        if (companyOpt.isEmpty()) {
            return Optional.empty();
        }
        Company company = companyOpt.get();
        Optional<String> fromProfile = digitsOnlyValid(company.getWhatsapp());
        if (fromProfile.isPresent()) {
            return fromProfile;
        }
        List<UserWhatsAppConnection> connections = connectionRepository.findByCompanyIdAndIsActiveTrue(companyId);
        for (UserWhatsAppConnection conn : connections) {
            String base = conn.getInstanceBaseUrl() != null && !conn.getInstanceBaseUrl().isBlank()
                    ? conn.getInstanceBaseUrl().trim()
                    : defaultBaseUrl;
            try {
                List<UazapInstanceDTO> instances = uazapService.fetchInstances(base);
                UazapInstanceDTO match = findMatchingInstance(conn, instances);
                if (match != null) {
                    Optional<String> fromDto = phoneDigitsFromInstanceDto(match);
                    if (fromDto.isPresent()) {
                        return fromDto;
                    }
                }
            } catch (Exception e) {
                log.warn("[LandingWhatsApp] UAZAP fetchInstances falhou para {}: {}", conn.getInstanceName(), e.getMessage());
            }
            // Listagem costuma omitir "number" mesmo conectado — owner vem em connectionState ou nos campos owner/wid.
            Optional<String> fromState = uazapService.tryResolveInstanceOwnerDigits(base, conn.getInstanceName());
            if (fromState.isPresent()) {
                return fromState;
            }
        }
        return Optional.empty();
    }

    /** number, ou owner/wid (JID) na listagem da API. */
    private static Optional<String> phoneDigitsFromInstanceDto(UazapInstanceDTO m) {
        if (m == null) {
            return Optional.empty();
        }
        if (m.getPhoneNumber() != null && !m.getPhoneNumber().isBlank()) {
            return digitsOnlyValid(m.getPhoneNumber().trim());
        }
        if (m.getOwner() != null && !m.getOwner().isBlank()) {
            Optional<String> d = digitsOnlyValid(stripJidToDigitsPart(m.getOwner().trim()));
            if (d.isPresent()) {
                return d;
            }
        }
        if (m.getWid() != null && !m.getWid().isBlank()) {
            return digitsOnlyValid(stripJidToDigitsPart(m.getWid().trim()));
        }
        return Optional.empty();
    }

    private static String stripJidToDigitsPart(String s) {
        int at = s.indexOf('@');
        if (at > 0) {
            s = s.substring(0, at);
        }
        int colon = s.indexOf(':');
        if (colon > 0) {
            s = s.substring(0, colon);
        }
        return s.trim();
    }

    private static Optional<String> digitsOnlyValid(String raw) {
        if (raw == null || raw.isBlank()) {
            return Optional.empty();
        }
        String d = raw.replaceAll("\\D", "");
        if (d.length() < MIN_WHATSAPP_DIGITS) {
            return Optional.empty();
        }
        return Optional.of(d);
    }

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
        String phone = api != null ? phoneDigitsFromInstanceDto(api).orElse("—") : "—";
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
