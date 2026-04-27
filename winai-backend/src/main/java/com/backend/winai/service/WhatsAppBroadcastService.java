package com.backend.winai.service;

import com.backend.winai.dto.request.SendMediaMessageRequest;
import com.backend.winai.dto.request.SendWhatsAppMessageRequest;
import com.backend.winai.dto.response.WhatsAppMessageResponse;
import com.backend.winai.dto.whatsapp.broadcast.ActiveBaseDashboardMetricsResponse;
import com.backend.winai.dto.whatsapp.broadcast.BroadcastPhonePartDto;
import com.backend.winai.dto.whatsapp.broadcast.CreateWhatsAppBroadcastRequest;
import com.backend.winai.dto.whatsapp.broadcast.WhatsAppBroadcastCampaignResponse;
import com.backend.winai.dto.whatsapp.broadcast.WhatsAppBroadcastDispatchReportDto;
import com.backend.winai.entity.*;
import com.backend.winai.repository.*;
import com.backend.winai.util.BroadcastContactFileParser;
import com.backend.winai.util.BroadcastPhoneParser;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Remarketing (Base Ativa): sequências agendadas via UaZap. Respeite opt-in e políticas da Meta.
 */
@Service
@Slf4j
public class WhatsAppBroadcastService {

    private final WhatsAppBroadcastCampaignRepository campaignRepository;
    private final WhatsAppBroadcastRecipientRepository recipientRepository;
    private final WhatsAppBroadcastDispatchRepository dispatchRepository;
    private final UserWhatsAppConnectionRepository connectionRepository;
    private final LeadRepository leadRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final WhatsAppService whatsAppService;
    private final WhatsAppBroadcastSequenceGenerator sequenceGenerator;

    private WhatsAppBroadcastService self;

    @Value("${winai.broadcast.max-recipients-per-campaign:50000}")
    private long maxRecipientsPerCampaign;

    @Value("${winai.broadcast.delay-between-messages-ms:1500}")
    private long delayBetweenMessagesMs;

    @Value("${winai.broadcast.daily-min-contacts:3}")
    private int dailyMinContacts;

    @Value("${winai.broadcast.daily-max-contacts:7}")
    private int dailyMaxContacts;

    @Value("${winai.broadcast.window-start-hour:9}")
    private int windowStartHour;

    @Value("${winai.broadcast.window-end-hour:18}")
    private int windowEndHour;

    @Value("${winai.broadcast.sequence-min:5}")
    private int sequenceMin;

    @Value("${winai.broadcast.sequence-max:10}")
    private int sequenceMax;

    public WhatsAppBroadcastService(
            WhatsAppBroadcastCampaignRepository campaignRepository,
            WhatsAppBroadcastRecipientRepository recipientRepository,
            WhatsAppBroadcastDispatchRepository dispatchRepository,
            UserWhatsAppConnectionRepository connectionRepository,
            LeadRepository leadRepository,
            CompanyRepository companyRepository,
            UserRepository userRepository,
            WhatsAppService whatsAppService,
            WhatsAppBroadcastSequenceGenerator sequenceGenerator) {
        this.campaignRepository = campaignRepository;
        this.recipientRepository = recipientRepository;
        this.dispatchRepository = dispatchRepository;
        this.connectionRepository = connectionRepository;
        this.leadRepository = leadRepository;
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.whatsAppService = whatsAppService;
        this.sequenceGenerator = sequenceGenerator;
    }

    @Autowired
    public void setSelf(@Lazy WhatsAppBroadcastService self) {
        this.self = self;
    }

    /**
     * Chamado pelo {@link WhatsAppBroadcastWorkerScheduler} quando o worker está habilitado.
     */
    public void processDueDispatchesBatch() {
        List<UUID> ids = dispatchRepository.findDueIdsForSending(
                WhatsAppBroadcastDispatch.Status.PENDING,
                WhatsAppBroadcastCampaign.Status.SENDING,
                ZonedDateTime.now(),
                PageRequest.of(0, 20));
        for (UUID id : ids) {
            try {
                self.deliverOneDispatch(id);
                Thread.sleep(delayBetweenMessagesMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                log.error("[Broadcast] Falha worker dispatch={}", id, e);
            }
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deliverOneDispatch(UUID dispatchId) {
        WhatsAppBroadcastDispatch d = dispatchRepository.findByIdForDelivery(dispatchId).orElse(null);
        if (d == null) {
            return;
        }
        if (d.getStatus() != WhatsAppBroadcastDispatch.Status.PENDING) {
            return;
        }
        if (d.getScheduledSendAt() != null && d.getScheduledSendAt().isAfter(ZonedDateTime.now())) {
            return;
        }
        WhatsAppBroadcastRecipient r = d.getRecipient();
        WhatsAppBroadcastCampaign campaign = r.getCampaign();
        if (campaign.getStatus() != WhatsAppBroadcastCampaign.Status.SENDING) {
            d.setStatus(WhatsAppBroadcastDispatch.Status.SKIPPED);
            dispatchRepository.save(d);
            syncRecipientAggregateStatus(r);
            return;
        }
        User user = campaign.getCreatedBy();
        if (user == null) {
            failDispatch(d, campaign, "Sem usuário criador para envio");
            return;
        }
        user = userRepository.findById(user.getId()).orElse(null);
        if (user == null) {
            failDispatch(d, campaign, "Usuário não encontrado");
            return;
        }

        UserWhatsAppConnection conn = campaign.getConnection();
        if (conn == null) {
            failDispatch(d, campaign, "Conexão WhatsApp não configurada");
            return;
        }

        try {
            WhatsAppMessageResponse response;
            boolean first = d.getSequenceIndex() == 1;
            if (first && campaign.getImageUrl() != null && !campaign.getImageUrl().isBlank()) {
                SendMediaMessageRequest media = SendMediaMessageRequest.builder()
                        .phoneNumber(r.getPhoneE164())
                        .caption(d.getBodyText())
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
            } else if (first && campaign.getVideoUrl() != null && !campaign.getVideoUrl().isBlank()) {
                SendMediaMessageRequest media = SendMediaMessageRequest.builder()
                        .phoneNumber(r.getPhoneE164())
                        .caption(d.getBodyText())
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
                        .message(d.getBodyText())
                        .uazapInstance(conn.getInstanceName())
                        .uazapBaseUrl(conn.getInstanceBaseUrl())
                        .uazapToken(conn.getInstanceToken())
                        .build();
                if (r.getLead() != null) {
                    req.setLeadId(r.getLead().getId());
                }
                response = whatsAppService.sendMessage(req, user);
            }

            d.setStatus(WhatsAppBroadcastDispatch.Status.SENT);
            d.setSentAt(ZonedDateTime.now());
            if (response != null && response.getMessageId() != null) {
                d.setProviderMessageId(response.getMessageId());
            }
            dispatchRepository.save(d);

            campaign.setSentCount(campaign.getSentCount() + 1);
            campaignRepository.save(campaign);
            syncRecipientAggregateStatus(r);
            maybeCompleteCampaign(campaign.getId());
        } catch (Exception e) {
            log.warn("[Broadcast] Envio falhou para {} seq {}: {}", r.getPhoneE164(), d.getSequenceIndex(), e.getMessage());
            failDispatch(d, campaign, truncate(e.getMessage(), 2000));
        }
    }

    private void failDispatch(WhatsAppBroadcastDispatch d, WhatsAppBroadcastCampaign campaign, String err) {
        d.setStatus(WhatsAppBroadcastDispatch.Status.FAILED);
        d.setErrorMessage(err);
        d.setSentAt(ZonedDateTime.now());
        dispatchRepository.save(d);
        campaign.setFailedCount(campaign.getFailedCount() + 1);
        campaignRepository.save(campaign);
        syncRecipientAggregateStatus(d.getRecipient());
        maybeCompleteCampaign(campaign.getId());
    }

    private void syncRecipientAggregateStatus(WhatsAppBroadcastRecipient r) {
        long pending = dispatchRepository.countByRecipient_IdAndStatus(r.getId(), WhatsAppBroadcastDispatch.Status.PENDING);
        if (pending > 0) {
            r.setStatus(WhatsAppBroadcastRecipient.Status.PENDING);
            recipientRepository.save(r);
            return;
        }
        long failed = dispatchRepository.countByRecipient_IdAndStatus(r.getId(), WhatsAppBroadcastDispatch.Status.FAILED);
        if (failed > 0) {
            r.setStatus(WhatsAppBroadcastRecipient.Status.FAILED);
        } else {
            long sent = dispatchRepository.countByRecipient_IdAndStatus(r.getId(), WhatsAppBroadcastDispatch.Status.SENT);
            if (sent > 0) {
                r.setStatus(WhatsAppBroadcastRecipient.Status.SENT);
            } else {
                r.setStatus(WhatsAppBroadcastRecipient.Status.SKIPPED);
            }
        }
        r.setSentAt(ZonedDateTime.now());
        recipientRepository.save(r);
    }

    private void maybeCompleteCampaign(UUID campaignId) {
        WhatsAppBroadcastCampaign c = campaignRepository.findById(campaignId).orElse(null);
        if (c == null || c.getStatus() != WhatsAppBroadcastCampaign.Status.SENDING) {
            return;
        }
        long pending = dispatchRepository.countByRecipient_Campaign_IdAndStatus(campaignId,
                WhatsAppBroadcastDispatch.Status.PENDING);
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

        String tz = req.getScheduleTimezone() != null && !req.getScheduleTimezone().isBlank()
                ? req.getScheduleTimezone().trim()
                : "America/Sao_Paulo";

        WhatsAppBroadcastCampaign campaign = WhatsAppBroadcastCampaign.builder()
                .company(company)
                .createdBy(user)
                .connection(conn)
                .name(req.getName().trim())
                .status(WhatsAppBroadcastCampaign.Status.QUEUED)
                .messageText(req.getMessageText())
                .companyPrompt(req.getCompanyPrompt() != null ? req.getCompanyPrompt() : "")
                .sequenceSize(null)
                .scheduleTimezone(tz)
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
        if (req.getPhoneParts() != null) {
            for (BroadcastPhonePartDto p : req.getPhoneParts()) {
                if (p == null) {
                    continue;
                }
                String n = BroadcastPhoneParser.normalizeStructured(p.getDdi(), p.getDdd(), p.getNumber());
                if (n != null) {
                    lines.add(n);
                }
            }
        }
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
        return BroadcastContactFileParser.parseToE164Lines(bytes, originalFilename);
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

        List<WhatsAppBroadcastRecipient> recipients =
                recipientRepository.findByCampaign_IdOrderByCreatedAtAsc(c.getId());
        if (recipients.isEmpty()) {
            c.setStatus(WhatsAppBroadcastCampaign.Status.FAILED);
            campaignRepository.save(c);
            throw new IllegalStateException("Sem destinatários");
        }

        int n = c.getSequenceSize() != null ? c.getSequenceSize() : ThreadLocalRandom.current()
                .nextInt(Math.min(sequenceMin, sequenceMax), Math.max(sequenceMin, sequenceMax) + 1);
        if (n < sequenceMin) {
            n = sequenceMin;
        }
        if (n > sequenceMax) {
            n = sequenceMax;
        }
        c.setSequenceSize(n);

        List<String> texts = sequenceGenerator.generateSequence(n, c.getCompanyPrompt(), c.getMessageText());

        Map<UUID, List<WhatsAppBroadcastDispatch>> byRecipient = new HashMap<>();
        List<WhatsAppBroadcastDispatch> allDispatches = new ArrayList<>();
        for (WhatsAppBroadcastRecipient r : recipients) {
            List<WhatsAppBroadcastDispatch> forR = new ArrayList<>();
            for (int i = 0; i < texts.size(); i++) {
                WhatsAppBroadcastDispatch d = WhatsAppBroadcastDispatch.builder()
                        .recipient(r)
                        .sequenceIndex(i + 1)
                        .bodyText(texts.get(i))
                        .status(WhatsAppBroadcastDispatch.Status.PENDING)
                        .build();
                forR.add(d);
                allDispatches.add(d);
            }
            byRecipient.put(r.getId(), forR);
        }

        ZoneId zone = ZoneId.of(c.getScheduleTimezone() != null ? c.getScheduleTimezone() : "America/Sao_Paulo");
        ZonedDateTime startedAt = ZonedDateTime.now(zone);
        c.setStartedAt(startedAt);
        c.setStatus(WhatsAppBroadcastCampaign.Status.SENDING);
        c.setSentCount(0);
        c.setFailedCount(0);
        campaignRepository.save(c);

        WhatsAppBroadcastDispatchSchedulePlanner.assignScheduledTimes(
                recipients,
                byRecipient,
                startedAt,
                Math.min(dailyMinContacts, dailyMaxContacts),
                Math.max(dailyMinContacts, dailyMaxContacts),
                windowStartHour,
                windowEndHour);

        dispatchRepository.saveAll(allDispatches);
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

        List<WhatsAppBroadcastDispatch> pendingDispatches =
                dispatchRepository.findByRecipient_Campaign_IdAndStatus(c.getId(), WhatsAppBroadcastDispatch.Status.PENDING);
        for (WhatsAppBroadcastDispatch d : pendingDispatches) {
            d.setStatus(WhatsAppBroadcastDispatch.Status.SKIPPED);
        }
        dispatchRepository.saveAll(pendingDispatches);

        recipientRepository.findByCampaign_IdOrderByCreatedAtAsc(c.getId()).stream()
                .filter(r -> r.getStatus() == WhatsAppBroadcastRecipient.Status.PENDING)
                .forEach(r -> {
                    r.setStatus(WhatsAppBroadcastRecipient.Status.SKIPPED);
                    recipientRepository.save(r);
                });
    }

    @Transactional(readOnly = true)
    public Page<WhatsAppBroadcastDispatchReportDto> listDispatchReports(
            User user, UUID campaignId, Pageable pageable) {
        WhatsAppBroadcastCampaign c = campaignRepository.findByIdAndCompany_Id(campaignId, user.getCompany().getId())
                .orElseThrow(() -> new IllegalArgumentException("Campanha não encontrada"));
        return dispatchRepository
                .pageByCampaignId(campaignId, pageable)
                .map(d -> toDispatchReportDto(d, c.getSequenceSize()));
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
        long sent = dispatchRepository.countByCompanyAndStatusSince(companyId,
                WhatsAppBroadcastDispatch.Status.SENT, since);
        long failed = dispatchRepository.countByCompanyAndStatusSince(companyId,
                WhatsAppBroadcastDispatch.Status.FAILED, since);
        return ActiveBaseDashboardMetricsResponse.builder()
                .totalContactsInBase(base)
                .messagesSentLast30Days(sent)
                .failedLast30Days(failed)
                .estimatedConversionLabel(null)
                .build();
    }

    private WhatsAppBroadcastCampaignResponse toResponse(WhatsAppBroadcastCampaign c, boolean includeReports) {
        long totalDispatches = dispatchRepository.countByRecipient_Campaign_Id(c.getId());
        int denom = totalDispatches > 0 ? (int) totalDispatches
                : (c.getSequenceSize() != null ? c.getSequenceSize() * Math.max(1, c.getTotalRecipients()) : 0);
        int progress = denom > 0
                ? (int) Math.round(100.0 * (c.getSentCount() + c.getFailedCount()) / denom)
                : 0;
        List<WhatsAppBroadcastDispatchReportDto> dispatchReports = null;
        if (includeReports) {
            dispatchReports = dispatchRepository.findAllFetchedByCampaignId(c.getId()).stream()
                    .map(d -> toDispatchReportDto(d, c.getSequenceSize()))
                    .toList();
        }
        return WhatsAppBroadcastCampaignResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .status(c.getStatus().name())
                .messageText(c.getMessageText())
                .companyPrompt(c.getCompanyPrompt())
                .sequenceSize(c.getSequenceSize())
                .scheduleTimezone(c.getScheduleTimezone())
                .imageUrl(c.getImageUrl())
                .videoUrl(c.getVideoUrl())
                .totalRecipients(c.getTotalRecipients())
                .sentCount(c.getSentCount())
                .failedCount(c.getFailedCount())
                .progressPercent(progress)
                .createdAt(c.getCreatedAt())
                .startedAt(c.getStartedAt())
                .completedAt(c.getCompletedAt())
                .dispatchReports(dispatchReports)
                .build();
    }

    private WhatsAppBroadcastDispatchReportDto toDispatchReportDto(WhatsAppBroadcastDispatch d, Integer campaignSequenceSize) {
        WhatsAppBroadcastRecipient r = d.getRecipient();
        int seqTotal = campaignSequenceSize != null
                ? campaignSequenceSize
                : (int) dispatchRepository.countByRecipient_Id(r.getId());
        if (seqTotal <= 0) {
            seqTotal = d.getSequenceIndex();
        }
        String statusLabel = d.getStatus() == WhatsAppBroadcastDispatch.Status.SENT ? "Enviado" : "Não enviado";
        return WhatsAppBroadcastDispatchReportDto.builder()
                .id(d.getId())
                .recipientLabel(maskPhoneForUi(r.getPhoneE164()))
                .sequenceIndex(d.getSequenceIndex())
                .sequenceTotal(seqTotal)
                .statusLabel(statusLabel)
                .timestamp(d.getSentAt() != null ? d.getSentAt() : d.getScheduledSendAt() != null
                        ? d.getScheduledSendAt()
                        : d.getCreatedAt())
                .build();
    }

    private static String maskPhoneForUi(String digits) {
        if (digits == null || digits.length() < 4) {
            return "—";
        }
        String tail = digits.substring(digits.length() - 4);
        if (digits.startsWith("55") && digits.length() >= 12) {
            String ddd = digits.substring(2, Math.min(4, digits.length() - 4));
            return "+55 (" + ddd + ") *****-" + tail;
        }
        return "*****" + tail;
    }
}
