package com.backend.winai.controller;

import com.backend.winai.service.WhatsAppCompanyInstancesService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

/**
 * Endpoints públicos para landing (sem JWT): ex. número WhatsApp por empresa para rota /w no front.
 */
@RestController
@RequestMapping("/api/v1/public")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PublicLandingController {

    private final WhatsAppCompanyInstancesService whatsAppCompanyInstancesService;

    /**
     * Sempre 200 quando o UUID é válido — {@code whatsappNumber} vazio significa empresa sem número
     * (perfil/UAZAP), não “endpoint inexistente”. Evita 404 confundir com deploy antigo ou proxy.
     */
    @GetMapping("/landing-whatsapp")
    public ResponseEntity<Map<String, String>> getLandingWhatsApp(@RequestParam("companyId") String companyIdRaw) {
        UUID companyId;
        try {
            companyId = UUID.fromString(companyIdRaw);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("whatsappNumber", ""));
        }
        String digits = whatsAppCompanyInstancesService.resolvePrimaryPhoneDigitsForCompany(companyId).orElse("");
        return ResponseEntity.ok(Map.of("whatsappNumber", digits));
    }
}
