package com.backend.winai.service;

import com.backend.winai.dto.marketing.CreateLeadAttributionAnchorRequest;
import com.backend.winai.dto.marketing.LeadAttributionAnchorResponse;
import com.backend.winai.dto.marketing.LeadAttributionMessageSuggestRequest;
import com.backend.winai.dto.marketing.LeadAttributionMessageSuggestResponse;
import com.backend.winai.dto.marketing.PatchLeadAttributionAnchorRequest;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.LeadAttributionAnchor;
import com.backend.winai.entity.User;
import com.backend.winai.entity.UserRole;
import com.backend.winai.repository.CompanyRepository;
import com.backend.winai.repository.LeadAttributionAnchorRepository;
import com.backend.winai.util.UtmParseUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class LeadAttributionAnchorService {

    private final LeadAttributionAnchorRepository anchorRepository;
    private final CompanyRepository companyRepository;
    private final OpenAiService openAiService;

    @Value("${winai.lead-attribution.min-cosine-similarity:0.80}")
    private double minCosineSimilarity;

    @Transactional
    public LeadAttributionAnchorResponse register(User user, CreateLeadAttributionAnchorRequest req) {
        if (req.getAnchorText() == null || req.getAnchorText().isBlank()) {
            throw new IllegalArgumentException("A mensagem do anúncio (anchorText) é obrigatória.");
        }
        String anchorTrimmed = req.getAnchorText().trim();
        if (anchorTrimmed.length() < 2) {
            throw new IllegalArgumentException("A mensagem do anúncio deve ter ao menos 2 caracteres.");
        }
        Company company = resolveCompany(user, null);
        if (!hasAnyAttribution(req)) {
            throw new IllegalArgumentException("Informe ao menos utm_campaign ou outro parâmetro UTM");
        }

        UUID id = UUID.randomUUID();
        LeadAttributionAnchor entity = LeadAttributionAnchor.builder()
                .id(id)
                .company(company)
                .anchorText(anchorTrimmed)
                .utmSource(trimToNull(req.getUtmSource()))
                .utmMedium(trimToNull(req.getUtmMedium()))
                .utmCampaign(trimToNull(req.getUtmCampaign()))
                .utmContent(trimToNull(req.getUtmContent()))
                .utmTerm(trimToNull(req.getUtmTerm()))
                .gclid(trimToNull(req.getGclid()))
                .fbclid(trimToNull(req.getFbclid()))
                .active(true)
                .label(trimToNull(req.getLabel()))
                .notes(trimToNull(req.getNotes()))
                .build();

        entity = anchorRepository.save(entity);
        List<Double> vector = openAiService.getEmbedding(entity.getAnchorText());
        anchorRepository.updateEmbedding(entity.getId(), vector.toString());
        log.info(
                "[SemanticAttr] âncora registrada id={} companyId={} utm_campaign={} textoPreview=\"{}\"",
                entity.getId(),
                company.getId(),
                entity.getUtmCampaign(),
                previewForLog(entity.getAnchorText()));
        return toResponse(entity);
    }

    /**
     * Melhor âncora por similaridade de cosseno; só retorna se {@code similarity >= minCosineSimilarity}.
     *
     * Roda em transação REQUIRES_NEW: se o pgvector falhar (extensão ausente), o erro aborta apenas
     * esta transação isolada — a transação externa (criação do lead) permanece íntegra. A exceção
     * é propagada para o caller, que faz o tratamento amplo (catch + log).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public Optional<UtmParseUtil.UtmSnapshot> findBestMatch(UUID companyId, String inboundMessageText) {
        if (inboundMessageText == null || inboundMessageText.isBlank()) {
            log.debug("[SemanticAttr] findBestMatch ignorado: texto vazio companyId={}", companyId);
            return Optional.empty();
        }
        log.info(
                "[SemanticAttr] findBestMatch início companyId={} minCosine={} inboundPreview=\"{}\"",
                companyId,
                String.format(Locale.ROOT, "%.2f", minCosineSimilarity),
                previewForLog(inboundMessageText));
        List<Double> q = openAiService.getEmbedding(inboundMessageText.trim());
        String qStr = q.toString();
        List<Object[]> rows = anchorRepository.findTopByCosineSimilarity(companyId, qStr, 2);
        if (rows.isEmpty()) {
            log.info(
                    "[SemanticAttr] nenhum candidato (âncoras ativas sem embedding ou tabela vazia) companyId={}",
                    companyId);
            return Optional.empty();
        }
        double top1 = toDouble(rows.get(0)[1]);
        UUID bestId = UUID.fromString((String) rows.get(0)[0]);
        if (top1 < minCosineSimilarity) {
            log.info(
                    "[SemanticAttr] abaixo do corte companyId={} melhorAnchorId={} cosineSim={} minRequerido={}",
                    companyId,
                    bestId,
                    String.format(Locale.ROOT, "%.4f", top1),
                    String.format(Locale.ROOT, "%.4f", minCosineSimilarity));
            return Optional.empty();
        }
        UUID anchorId = bestId;
        if (rows.size() > 1) {
            double top2 = toDouble(rows.get(1)[1]);
            UUID secondId = UUID.fromString((String) rows.get(1)[0]);
            if (top2 >= minCosineSimilarity && (top1 - top2) < 0.02) {
                log.warn(
                        "[SemanticAttr] match ambíguo companyId={} anchor1={} sim1={} anchor2={} sim2={}",
                        companyId,
                        anchorId,
                        String.format(Locale.ROOT, "%.4f", top1),
                        secondId,
                        String.format(Locale.ROOT, "%.4f", top2));
            } else {
                log.debug(
                        "[SemanticAttr] segundo lugar companyId={} anchor2={} sim2={}",
                        companyId,
                        secondId,
                        String.format(Locale.ROOT, "%.4f", top2));
            }
        }
        Optional<LeadAttributionAnchor> anchorOpt = anchorRepository.findById(anchorId);
        if (anchorOpt.isEmpty()) {
            log.warn("[SemanticAttr] anchorId {} sumiu após ranking companyId={}", anchorId, companyId);
            return Optional.empty();
        }
        LeadAttributionAnchor matched = anchorOpt.get();
        log.info(
                "[SemanticAttr] match OK companyId={} anchorId={} cosineSim={} utm_campaign={} anchorPreview=\"{}\"",
                companyId,
                anchorId,
                String.format(Locale.ROOT, "%.4f", top1),
                matched.getUtmCampaign(),
                previewForLog(matched.getAnchorText()));
        return Optional.of(toUtmSnapshot(matched));
    }

    @Transactional(readOnly = true)
    public LeadAttributionMessageSuggestResponse suggestMessage(User user, LeadAttributionMessageSuggestRequest req) {
        if (!openAiService.isChatEnabled()) {
            return LeadAttributionMessageSuggestResponse.builder().suggestedText(null).build();
        }
        StringBuilder ctx = new StringBuilder();
        if (req.getContext() != null && !req.getContext().isBlank()) {
            ctx.append(req.getContext().trim()).append("\n");
        }
        if (req.getUtmCampaign() != null) {
            ctx.append("Campanha (id no ads): ").append(req.getUtmCampaign()).append("\n");
        }
        if (req.getUtmContent() != null) {
            ctx.append("Anúncio/creative (id no ads): ").append(req.getUtmContent()).append("\n");
        }
        if (req.getUtmTerm() != null) {
            ctx.append("Conjunto (id no ads): ").append(req.getUtmTerm()).append("\n");
        }
        if (req.getUtmSource() != null) {
            ctx.append("Canal de mídia: ").append(req.getUtmSource()).append("\n");
        }
        if (req.getUtmMedium() != null) {
            ctx.append("Tipo de veiculação: ").append(req.getUtmMedium()).append("\n");
        }
        String prompt = ctx.toString().trim();
        if (prompt.isEmpty()) {
            return LeadAttributionMessageSuggestResponse.builder().suggestedText(null).build();
        }
        String text = openAiService.suggestMarketingWhatsAppFirstMessage(prompt);
        return LeadAttributionMessageSuggestResponse.builder().suggestedText(text).build();
    }

    @Transactional(readOnly = true)
    public List<LeadAttributionAnchorResponse> list(User user) {
        Company company = resolveCompany(user, null);
        return anchorRepository.findByCompanyOrderByCreatedAtDesc(company).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public LeadAttributionAnchorResponse patch(User user, UUID anchorId, PatchLeadAttributionAnchorRequest req) {
        Company company = resolveCompany(user, null);
        LeadAttributionAnchor entity = anchorRepository.findById(anchorId)
                .orElseThrow(() -> new IllegalArgumentException("Âncora não encontrada"));
        if (!entity.getCompany().getId().equals(company.getId())) {
            throw new IllegalArgumentException("Acesso negado");
        }
        if (req.getActive() != null) {
            entity.setActive(req.getActive());
        }
        entity = anchorRepository.save(entity);
        return toResponse(entity);
    }

    private UtmParseUtil.UtmSnapshot toUtmSnapshot(LeadAttributionAnchor a) {
        return UtmParseUtil.UtmSnapshot.builder()
                .utmSource(a.getUtmSource())
                .utmMedium(a.getUtmMedium())
                .utmCampaign(a.getUtmCampaign())
                .utmContent(a.getUtmContent())
                .utmTerm(a.getUtmTerm())
                .gclid(a.getGclid())
                .fbclid(a.getFbclid())
                .build();
    }

    private LeadAttributionAnchorResponse toResponse(LeadAttributionAnchor a) {
        return LeadAttributionAnchorResponse.builder()
                .id(a.getId())
                .anchorText(a.getAnchorText())
                .utmSource(a.getUtmSource())
                .utmMedium(a.getUtmMedium())
                .utmCampaign(a.getUtmCampaign())
                .utmContent(a.getUtmContent())
                .utmTerm(a.getUtmTerm())
                .gclid(a.getGclid())
                .fbclid(a.getFbclid())
                .active(Boolean.TRUE.equals(a.getActive()))
                .label(a.getLabel())
                .notes(a.getNotes())
                .createdAt(a.getCreatedAt())
                .build();
    }

    private static String previewForLog(String s) {
        if (s == null) {
            return "";
        }
        String t = s.trim().replaceAll("\\s+", " ");
        if (t.length() > 160) {
            return t.substring(0, 157) + "...";
        }
        return t;
    }

    private static double toDouble(Object o) {
        if (o == null) {
            return 0;
        }
        if (o instanceof Double d) {
            return d;
        }
        if (o instanceof Float f) {
            return f.doubleValue();
        }
        if (o instanceof BigDecimal bd) {
            return bd.doubleValue();
        }
        if (o instanceof Number n) {
            return n.doubleValue();
        }
        return Double.parseDouble(o.toString());
    }

    private static String trimToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private static boolean hasAnyAttribution(CreateLeadAttributionAnchorRequest req) {
        return req.getUtmCampaign() != null && !req.getUtmCampaign().isBlank()
                || req.getUtmSource() != null && !req.getUtmSource().isBlank()
                || req.getUtmMedium() != null && !req.getUtmMedium().isBlank()
                || req.getUtmContent() != null && !req.getUtmContent().isBlank()
                || req.getUtmTerm() != null && !req.getUtmTerm().isBlank()
                || req.getGclid() != null && !req.getGclid().isBlank()
                || req.getFbclid() != null && !req.getFbclid().isBlank();
    }

    private Company resolveCompany(User user, UUID requestedCompanyId) {
        if (user.getCompany() == null) {
            throw new IllegalStateException("Usuário sem empresa");
        }
        if (requestedCompanyId != null) {
            if (user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.SUPER_ADMIN) {
                return companyRepository.findById(requestedCompanyId)
                        .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));
            }
            throw new RuntimeException("Acesso negado: Apenas administradores podem selecionar empresas.");
        }
        return user.getCompany();
    }
}
