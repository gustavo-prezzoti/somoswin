package com.backend.winai.service;

import com.backend.winai.dto.marketing.CreateWhatsappAttributionTokenRequest;
import com.backend.winai.dto.marketing.WhatsappAttributionTokenResponse;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.User;
import com.backend.winai.entity.WhatsAppAttributionToken;
import com.backend.winai.repository.WhatsAppAttributionTokenRepository;
import com.backend.winai.util.AttributionRefTokenExtractor;
import com.backend.winai.util.UtmParseUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

/**
 * Token opaco (não é criptografia): mensagem “normal” + {@code ref:TOKEN}; o webhook faz de-para para UTM.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WhatsAppAttributionTokenService {

    private static final String DEFAULT_INTRO = "Olá! Gostaria de mais informações.";
    private static final int TOKEN_BYTES = 9;
    private static final int MAX_TOKEN_ATTEMPTS = 8;

    private final WhatsAppAttributionTokenRepository repository;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public WhatsappAttributionTokenResponse create(User user, CreateWhatsappAttributionTokenRequest req) {
        if (user.getCompany() == null) {
            throw new IllegalStateException("Usuário sem empresa");
        }
        if (!hasAnyAttribution(req)) {
            throw new IllegalArgumentException("Informe ao menos utm_campaign ou outro parâmetro UTM");
        }
        Company company = user.getCompany();

        String token = null;
        for (int attempt = 0; attempt < MAX_TOKEN_ATTEMPTS; attempt++) {
            String candidate = randomUrlToken();
            WhatsAppAttributionToken row = WhatsAppAttributionToken.builder()
                    .token(candidate)
                    .company(company)
                    .utmSource(trimToNull(req.getUtmSource()))
                    .utmMedium(trimToNull(req.getUtmMedium()))
                    .utmCampaign(trimToNull(req.getUtmCampaign()))
                    .utmContent(trimToNull(req.getUtmContent()))
                    .utmTerm(trimToNull(req.getUtmTerm()))
                    .gclid(trimToNull(req.getGclid()))
                    .fbclid(trimToNull(req.getFbclid()))
                    .build();
            try {
                repository.save(row);
                token = candidate;
                break;
            } catch (DataIntegrityViolationException e) {
                log.debug("[AttrToken] colisão de token, tentativa {}", attempt + 1);
            }
        }
        if (token == null) {
            throw new IllegalStateException("Não foi possível gerar token único");
        }

        String intro = trimToNull(req.getIntroLine());
        if (intro == null) {
            intro = DEFAULT_INTRO;
        }
        String suggested = intro + "\n\nref:" + token;
        return WhatsappAttributionTokenResponse.builder()
                .token(token)
                .suggestedMessage(suggested)
                .build();
    }

    @Transactional(readOnly = true)
    public Optional<UtmParseUtil.UtmSnapshot> resolveSnapshotFromMessage(String messageText, UUID companyId) {
        Optional<String> tokenOpt = AttributionRefTokenExtractor.findPublicToken(messageText);
        if (tokenOpt.isEmpty()) {
            return Optional.empty();
        }
        String token = tokenOpt.get();
        Optional<WhatsAppAttributionToken> rowOpt = repository.findByTokenFetchCompany(token);
        if (rowOpt.isEmpty()) {
            log.debug("[AttrToken] token desconhecido: {}", token);
            return Optional.empty();
        }
        WhatsAppAttributionToken row = rowOpt.get();
        if (!row.getCompany().getId().equals(companyId)) {
            log.warn("[AttrToken] token {} pertence a outra empresa", token);
            return Optional.empty();
        }
        return Optional.of(toSnapshot(row));
    }

    private static UtmParseUtil.UtmSnapshot toSnapshot(WhatsAppAttributionToken e) {
        return UtmParseUtil.UtmSnapshot.builder()
                .utmSource(e.getUtmSource())
                .utmMedium(e.getUtmMedium())
                .utmCampaign(e.getUtmCampaign())
                .utmContent(e.getUtmContent())
                .utmTerm(e.getUtmTerm())
                .gclid(e.getGclid())
                .fbclid(e.getFbclid())
                .build();
    }

    private String randomUrlToken() {
        byte[] b = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(b);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
    }

    private static boolean hasAnyAttribution(CreateWhatsappAttributionTokenRequest req) {
        return trimToNull(req.getUtmSource()) != null
                || trimToNull(req.getUtmMedium()) != null
                || trimToNull(req.getUtmCampaign()) != null
                || trimToNull(req.getUtmContent()) != null
                || trimToNull(req.getUtmTerm()) != null
                || trimToNull(req.getGclid()) != null
                || trimToNull(req.getFbclid()) != null;
    }

    private static String trimToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
