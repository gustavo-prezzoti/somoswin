package com.backend.winai.service;

import com.backend.winai.dto.request.SendMediaMessageRequest;
import com.backend.winai.dto.request.SendWhatsAppMessageRequest;
import com.backend.winai.dto.response.WhatsAppMessageResponse;
import com.backend.winai.dto.whatsapp.broadcast.*;
import com.backend.winai.entity.*;
import com.backend.winai.repository.*;
import com.backend.winai.util.BroadcastContactFileParser;
import com.backend.winai.util.BroadcastPhoneParser;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Disparos em massa (Base Ativa) via UaZap. Uso deve respeitar opt-in da base e políticas da Meta.
 */
@Service
@Slf4j
public class WhatsAppBroadcastService {

    private final WhatsAppBroadcastCampaignRepository campaignRepository;
    private final WhatsAppBroadcastRecipientRepository recipientRepository;
    private final UserWhatsAppConnectionRepository connectionRepository;
    private final LeadRepository leadRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final WhatsAppService whatsAppService;

    private WhatsAppBroadcastService self;

    @Value("${winai.broadcast.max-recipients-per-campaign:50000}")
    private long maxRecipientsPerCampaign;

    @Value("${winai.broadcast.delay-between-messages-ms:1500}")
    private long delayBetweenMessagesMs;

    public WhatsAppBroadcastService(
            WhatsAppBroadcastCampaignRepository campaignRepository,
            WhatsAppBroadcastRecipientRepository recipientRepository,
            UserWhatsAppConnectionRepository connectionRepository,
            LeadRepository leadRepository,
            CompanyRepository companyRepository,
            UserRepository userRepository,
            WhatsAppService whatsAppService) {
        this.campaignRepository = campaignRepository;
        this.recipientRepository = recipientRepository;
        this.connectionRepository = connectionRepository;
        this.leadRepository = leadRepository;
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.whatsAppService = whatsAppService;
    }

    @Autowired
    public void setSelf(@Lazy WhatsAppBroadcastService self) {
        this.self = self;
    }

    @Scheduled(fixedDelayString = "${winai.broadcast.worker-interval-ms:3000}")
    public void runWorker() {
        List<WhatsAppBroadcastRecipient> batch = recipientRepository
                .findTop20ByStatusAndCampaign_StatusOrderByCreatedAtAsc(
                        WhatsAppBroadcastRecipient.Status.PENDING,
                        WhatsAppBroadcastCampaign.Status.SENDING);
        for (WhatsAppBroadcastRecipient r : batch) {
            try {
                self.deliverOneRecipient(r.getId());
                Thread.sleep(delayBetweenMessagesMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                log.error("[Broadcast] Falha worker recipient={}", r.getId(), e);
            }
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deliverOneRecipient(UUID recipientId) {
        WhatsAppBroadcastRecipient r = recipientRepository.findByIdForDelivery(recipientId).orElse(null);
        if (r == null) {
            return;
        }
        if (r.getStatus() != WhatsAppBroadcastRecipient.Status.PENDING) {
            return;
        }
        WhatsAppBroadcastCampaign campaign = r.getCampaign();
        if (campaign.getStatus() != WhatsAppBroadcastCampaign.Status.SENDING) {
            r.setStatus(WhatsAppBroadcastRecipient.Status.SKIPPED);
            recipientRepository.save(r);
            return;
        }
        User user = campaign.getCreatedBy();
        if (user == null) {
            failRecipient(r, campaign, "Sem usuário criador para envio");
            return;
        }
        user = userRepository.findById(user.getId()).orElse(null);
        if (user == null) {
            failRecipient(r, campaign, "Usuário não encontrado");
            return;
        }

        UserWhatsAppConnection conn = campaign.getConnection();
        if (conn == null) {
            failRecipient(r, campaign, "Conexão WhatsApp não configurada");
            return;
        }

        try {
            WhatsAppMessageResponse response;
            if (campaign.getImageUrl() != null && !campaign.getImageUrl().isBlank()) {
                SendMediaMessageRequest media = SendMediaMessageRequest.builder()
                        .phoneNumber(r.getPhoneE164())
                        .caption(campaign.getMessageText())
                        .mediaUrl(campaign.getImageUrl())
                        .mediaType("image")
                        .uazapInstance(conn.getInstanceName())
                        .uazapBaseUrl(conn.getInstanceBaseUrl())
                        .uazapToken(conn.getInstanceToken())
                        .build();
                if (r.getLead() != null) {
                    media.setLeadId(r.getLead().getId());
                }
                response = whatsAppService.sendMediaMessage(media, user);
            } else if (campaign.getVideoUrl() != null && !campaign.getVideoUrl().isBlank()) {
                SendMediaMessageRequest media = SendMediaMessageRequest.builder()
                        .phoneNumber(r.getPhoneE164())
                        .caption(campaign.getMessageText())
                        .mediaUrl(campaign.getVideoUrl())
                        .mediaType("video")
                        .uazapInstance(conn.getInstanceName())
                        .uazapBaseUrl(conn.getInstanceBaseUrl())
                        .uazapToken(conn.getInstanceToken())
                        .build();
                if (r.getLead() != null) {
                    media.setLeadId(r.getLead().getId());
                }
                response = whatsAppService.sendMediaMessage(media, user);
            } else {
                SendWhatsAppMessageRequest req = SendWhatsAppMessageRequest.builder()
                        .phoneNumber(r.getPhoneE164())
                        .message(campaign.getMessageText())
                        .uazapInstance(conn.getInstanceName())
                        .uazapBaseUrl(conn.getInstanceBaseUrl())
                        .uazapToken(conn.getInstanceToken())
                        .build();
                if (r.getLead() != null) {
                    req.setLeadId(r.getLead().getId());
                }
                response = whatsAppService.sendMessage(req, user);
            }

            r.setStatus(WhatsAppBroadcastRecipient.Status.SENT);
            r.setSentAt(ZonedDateTime.now());
            if (response != null && response.getMessageId() != null) {
                r.setProviderMessageId(response.getMessageId());
            }
            recipientRepository.save(r);

            campaign.setSentCount(campaign.getSentCount() + 1);
            campaignRepository.save(campaign);
            maybeCompleteCampaign(campaign.getId());
        } catch (Exception e) {
            log.warn("[Broadcast] Envio falhou para {}: {}", r.getPhoneE164(), e.getMessage());
            failRecipient(r, campaign, truncate(e.getMessage(), 2000));
        }
    }

    private void failRecipient(WhatsAppBroadcastRecipient r, WhatsAppBroadcastCampaign campaign, String err) {
        r.setStatus(WhatsAppBroadcastRecipient.Status.FAILED);
        r.setErrorMessage(err);
        r.setSentAt(ZonedDateTime.now());
        recipientRepository.save(r);
        campaign.setFailedCount(campaign.getFailedCount() + 1);
        campaignRepository.save(campaign);
        maybeCompleteCampaign(campaign.getId());
    }

    private void maybeCompleteCampaign(UUID campaignId) {
        WhatsAppBroadcastCampaign c = campaignRepository.findById(campaignId).orElse(null);
        if (c == null || c.getStatus() != WhatsAppBroadcastCampaign.Status.SENDING) {
            return;
        }
        long pending = recipientRepository.countByCampaign_IdAndStatus(campaignId,
                WhatsAppBroadcastRecipient.Status.PENDING);
        if (pending == 0) {
            c.setStatus(WhatsAppBroadcastCampaign.Status.COMPLETED);
            c.setCompletedAt(ZonedDateTime.now());
            campaignRepository.save(c);
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return null;
        }
        return s.length() <= max ? s : s.substring(0, max);
    }

    /**
     * @param extraRawLinesFromFile linhas brutas vindas de CSV/XLSX (antes da normalização)
     */
    @Transactional
    public WhatsAppBroadcastCampaignResponse createAndOptionallyStart(User user, CreateWhatsAppBroadcastRequest req,
            List<String> extraRawLinesFromFile) {
        if (user.getCompany() == null) {
            throw new IllegalStateException("Usuário sem empresa");
        }
        if (!req.isConfirmOptIn()) {
            throw new IllegalArgumentException("Confirme que possui opt-in para contatar esta base.");
        }
        Company company = companyRepository.findById(user.getCompany().getId())
                .orElseThrow(() -> new IllegalStateException("Empresa não encontrada"));

        UserWhatsAppConnection conn = connectionRepository
                .findByIdAndCompany_Id(req.getConnectionId(), company.getId())
                .orElseThrow(() -> new IllegalArgumentException("Conexão inválida para esta empresa"));
        if (!Boolean.TRUE.equals(conn.getIsActive())) {
            throw new IllegalArgumentException("Conexão WhatsApp inativa");
        }

        List<String> phones = collectPhones(req, extraRawLinesFromFile);
        if (phones.isEmpty()) {
            throw new IllegalArgumentException("Informe ao menos um número válido");
        }

        long maxAllowed = resolveMaxRecipients(company);
        if (phones.size() > maxAllowed) {
            throw new IllegalArgumentException("Limite do plano: máximo " + maxAllowed + " destinatários por campanha");
        }
        if (phones.size() > maxRecipientsPerCampaign) {
            throw new IllegalArgumentException("Máximo de " + maxRecipientsPerCampaign + " destinatários por campanha");
        }

        WhatsAppBroadcastCampaign campaign = WhatsAppBroadcastCampaign.builder()
                .company(company)
                .createdBy(user)
                .connection(conn)
                .name(req.getName().trim())
                .status(WhatsAppBroadcastCampaign.Status.QUEUED)
                .messageText(req.getMessageText())
                .imageUrl(blankToNull(req.getImageUrl()))
                .videoUrl(blankToNull(req.getVideoUrl()))
                .totalRecipients(phones.size())
                .build();
        campaign = campaignRepository.save(campaign);

        List<WhatsAppBroadcastRecipient> rows = new ArrayList<>();
        for (String phone : phones) {
            Optional<Lead> lead = findLeadForPhone(company, phone);
            WhatsAppBroadcastRecipient row = WhatsAppBroadcastRecipient.builder()
                    .campaign(campaign)
                    .phoneE164(phone)
                    .lead(lead.orElse(null))
                    .status(WhatsAppBroadcastRecipient.Status.PENDING)
                    .build();
            rows.add(row);
        }
        recipientRepository.saveAll(rows);

        if (req.isStartImmediately()) {
            startCampaign(user, campaign.getId());
        }

        return toResponse(campaignRepository.findById(campaign.getId()).orElse(campaign), true);
    }

    private long resolveMaxRecipients(Company company) {
        Plan plan = company.getPlanEntity();
        int mult = plan != null && plan.getWhatsappLimit() != null ? plan.getWhatsappLimit() : 1;
        return Math.min(maxRecipientsPerCampaign, Math.max(100L, (long) mult * 2000L));
    }

    private List<String> collectPhones(CreateWhatsAppBroadcastRequest req, List<String> extraRawLinesFromFile) {
        List<String> lines = new ArrayList<>();
        if (req.getPhones() != null) {
            lines.addAll(req.getPhones());
        }
        if (req.getPhonesRaw() != null && !req.getPhonesRaw().isBlank()) {
            for (String line : req.getPhonesRaw().split("\\R")) {
                lines.add(line);
            }
        }
        if (extraRawLinesFromFile != null) {
            lines.addAll(extraRawLinesFromFile);
        }
        return BroadcastPhoneParser.parseLinesDedupe(lines);
    }

    /** Parse de arquivo no servidor (validação única). */
    public List<String> parseContactsFile(byte[] bytes, String originalFilename) {
        return BroadcastContactFileParser.extractRawLines(bytes, originalFilename);
    }

    private Optional<Lead> findLeadForPhone(Company company, String phoneE164) {
        Optional<Lead> a = leadRepository.findByPhoneAndCompany(phoneE164, company);
        if (a.isPresent()) {
            return a;
        }
        if (phoneE164.length() > 2 && phoneE164.startsWith("55")) {
            return leadRepository.findByPhoneAndCompany(phoneE164.substring(2), company);
        }
        return Optional.empty();
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    @Transactional
    public void startCampaign(User user, UUID campaignId) {
        WhatsAppBroadcastCampaign c = campaignRepository.findByIdAndCompany_Id(campaignId, user.getCompany().getId())
                .orElseThrow(() -> new IllegalArgumentException("Campanha não encontrada"));
        if (c.getStatus() != WhatsAppBroadcastCampaign.Status.QUEUED && c.getStatus() != WhatsAppBroadcastCampaign.Status.DRAFT) {
            throw new IllegalStateException("Campanha não pode ser iniciada neste status");
        }
        if (c.getTotalRecipients() == 0) {
            c.setStatus(WhatsAppBroadcastCampaign.Status.FAILED);
            campaignRepository.save(c);
            throw new IllegalStateException("Sem destinatários");
        }
        c.setStatus(WhatsAppBroadcastCampaign.Status.SENDING);
        c.setStartedAt(ZonedDateTime.now());
        campaignRepository.save(c);
    }

    @Transactional
    public void cancelCampaign(User user, UUID campaignId) {
        WhatsAppBroadcastCampaign c = campaignRepository.findByIdAndCompany_Id(campaignId, user.getCompany().getId())
                .orElseThrow(() -> new IllegalArgumentException("Campanha não encontrada"));
        if (c.getStatus() != WhatsAppBroadcastCampaign.Status.QUEUED
                && c.getStatus() != WhatsAppBroadcastCampaign.Status.SENDING) {
            throw new IllegalStateException("Campanha não pode ser cancelada");
        }
        c.setStatus(WhatsAppBroadcastCampaign.Status.CANCELLED);
        c.setCompletedAt(ZonedDateTime.now());
        campaignRepository.save(c);
        recipientRepository.findByCampaign_IdOrderByCreatedAtAsc(c.getId()).stream()
                .filter(r -> r.getStatus() == WhatsAppBroadcastRecipient.Status.PENDING)
                .forEach(r -> {
                    r.setStatus(WhatsAppBroadcastRecipient.Status.SKIPPED);
                    recipientRepository.save(r);
                });
    }

    @Transactional(readOnly = true)
    public Page<WhatsAppBroadcastCampaignResponse> list(User user, Pageable pageable) {
        return campaignRepository.findByCompany_IdOrderByCreatedAtDesc(user.getCompany().getId(), pageable)
                .map(c -> toResponse(c, false));
    }

    @Transactional(readOnly = true)
    public WhatsAppBroadcastCampaignResponse get(User user, UUID id) {
        WhatsAppBroadcastCampaign c = campaignRepository.findByIdAndCompany_Id(id, user.getCompany().getId())
                .orElseThrow(() -> new IllegalArgumentException("Campanha não encontrada"));
        return toResponse(c, true);
    }

    @Transactional(readOnly = true)
    public ActiveBaseDashboardMetricsResponse dashboardMetrics(User user) {
        UUID companyId = user.getCompany().getId();
        long base = leadRepository.countByCompany_IdAndPhoneIsNotNull(companyId);
        ZonedDateTime since = ZonedDateTime.now().minusDays(30);
        long sent = recipientRepository.countByCompanyAndStatusSince(companyId,
                WhatsAppBroadcastRecipient.Status.SENT, since);
        long failed = recipientRepository.countByCompanyAndStatusSince(companyId,
                WhatsAppBroadcastRecipient.Status.FAILED, since);
        return ActiveBaseDashboardMetricsResponse.builder()
                .totalContactsInBase(base)
                .messagesSentLast30Days(sent)
                .failedLast30Days(failed)
                .estimatedConversionLabel(null)
                .build();
    }

    private WhatsAppBroadcastCampaignResponse toResponse(WhatsAppBroadcastCampaign c, boolean includeReports) {
        int progress = c.getTotalRecipients() > 0
                ? (int) Math.round(100.0 * (c.getSentCount() + c.getFailedCount()) / c.getTotalRecipients())
                : 0;
        List<WhatsAppBroadcastRecipientResponse> reports = null;
        if (includeReports) {
            reports = recipientRepository.findByCampaign_IdOrderByCreatedAtAsc(c.getId()).stream()
                    .map(this::toRecipientResponse)
                    .toList();
        }
        return WhatsAppBroadcastCampaignResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .status(c.getStatus().name())
                .messageText(c.getMessageText())
                .imageUrl(c.getImageUrl())
                .videoUrl(c.getVideoUrl())
                .totalRecipients(c.getTotalRecipients())
                .sentCount(c.getSentCount())
                .failedCount(c.getFailedCount())
                .progressPercent(progress)
                .createdAt(c.getCreatedAt())
                .startedAt(c.getStartedAt())
                .completedAt(c.getCompletedAt())
                .reports(reports)
                .build();
    }

    private WhatsAppBroadcastRecipientResponse toRecipientResponse(WhatsAppBroadcastRecipient r) {
        String uiStatus = switch (r.getStatus()) {
            case SENT -> "sent";
            case FAILED -> "failed";
            default -> "pending";
        };
        String name = r.getLead() != null ? r.getLead().getName() : "—";
        return WhatsAppBroadcastRecipientResponse.builder()
                .id(r.getId())
                .contactId(r.getLead() != null ? r.getLead().getId().toString() : r.getId().toString())
                .contactName(name)
                .contactInfo(r.getPhoneE164())
                .status(uiStatus)
                .error(r.getErrorMessage())
                .timestamp(r.getSentAt() != null ? r.getSentAt() : r.getCreatedAt())
                .build();
    }
}
