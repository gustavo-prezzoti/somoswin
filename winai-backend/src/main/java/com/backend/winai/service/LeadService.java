package com.backend.winai.service;

import com.backend.winai.dto.request.LeadRequest;
import com.backend.winai.dto.response.LeadResponse;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.Lead;
import com.backend.winai.entity.LeadStatus;
import com.backend.winai.entity.WhatsAppConversation;
import com.backend.winai.repository.CompanyRepository;
import com.backend.winai.repository.LeadRepository;
import com.backend.winai.repository.WhatsAppMessageRepository;
import com.backend.winai.repository.WhatsAppConversationRepository;
import com.backend.winai.repository.MeetingRepository;
import com.backend.winai.repository.WhatsAppBroadcastRecipientRepository;
import com.backend.winai.repository.FollowUpStatusRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LeadService {

    private static final int CRM_KANBAN_TITLE_MAX_LEN = 40;

    private final LeadRepository leadRepository;
    private final CompanyRepository companyRepository;
    private final ObjectMapper objectMapper;
    private final WhatsAppMessageRepository messageRepository;
    private final WhatsAppConversationRepository conversationRepository;
    private final MeetingRepository meetingRepository;
    private final WhatsAppBroadcastRecipientRepository broadcastRecipientRepository;
    private final FollowUpStatusRepository followUpStatusRepository;
    private final ChatMemoryService chatMemoryService;
    private final SupabaseStorageService supabaseStorageService;

    private static final Map<LeadStatus, String> STATUS_LABELS = createStatusLabels();

    private static Map<LeadStatus, String> createStatusLabels() {
        Map<LeadStatus, String> m = new HashMap<>();
        m.put(LeadStatus.NEW, "Novos Leads");
        m.put(LeadStatus.CONTACTED, "Em Contato");
        m.put(LeadStatus.QUALIFIED, "Qualificados");
        m.put(LeadStatus.MEETING_SCHEDULED, "Reunião");
        m.put(LeadStatus.PROPOSAL_SENT, "Proposta");
        m.put(LeadStatus.NEGOTIATION, "Negociação");
        m.put(LeadStatus.WON, "Ganhos");
        m.put(LeadStatus.LOST, "Perdidos");
        return m;
    }

    /**
     * Lista todos os leads da empresa
     */
    @Transactional(readOnly = true)
    public List<LeadResponse> getAllLeads(Company company) {
        return leadRepository.findByCompanyOrderByCreatedAtDesc(company)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lista leads paginados
     */
    @Transactional(readOnly = true)
    public Page<LeadResponse> getLeadsPaged(Company company, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return leadRepository.findByCompanyOrderByCreatedAtDesc(company, pageable)
                .map(this::toResponse);
    }

    /**
     * Busca leads por termo
     */
    @Transactional(readOnly = true)
    public Page<LeadResponse> searchLeads(Company company, String search, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return leadRepository.searchByCompany(company, search, pageable)
                .map(this::toResponse);
    }

    /**
     * Títulos personalizados das colunas do Kanban CRM (por empresa). Chaves = LeadStatus.name().
     */
    @Transactional(readOnly = true)
    public Map<String, String> getCrmKanbanColumnTitles(Company company) {
        return companyRepository.findById(company.getId())
                .map(this::parseCrmKanbanColumnTitles)
                .orElseGet(LinkedHashMap::new);
    }

    private Map<String, String> parseCrmKanbanColumnTitles(Company c) {
        String raw = c.getCrmKanbanColumnTitles();
        if (raw == null || raw.isBlank()) {
            return new LinkedHashMap<>();
        }
        try {
            Map<String, String> parsed = objectMapper.readValue(raw, new TypeReference<Map<String, String>>() {});
            Map<String, String> out = new LinkedHashMap<>();
            for (Map.Entry<String, String> e : parsed.entrySet()) {
                try {
                    LeadStatus st = LeadStatus.valueOf(e.getKey().trim().toUpperCase());
                    if (e.getValue() == null) {
                        continue;
                    }
                    String t = e.getValue().trim();
                    if (t.isEmpty()) {
                        continue;
                    }
                    if (t.length() > CRM_KANBAN_TITLE_MAX_LEN) {
                        t = t.substring(0, CRM_KANBAN_TITLE_MAX_LEN);
                    }
                    out.put(st.name(), t);
                } catch (IllegalArgumentException ignored) {
                    // ignora chave inválida
                }
            }
            return out;
        } catch (Exception e) {
            return new LinkedHashMap<>();
        }
    }

    /**
     * Persiste títulos customizados; remove entradas iguais ao padrão; mapa vazio limpa o JSON.
     */
    @Transactional
    public Map<String, String> updateCrmKanbanColumnTitles(Company company, Map<String, String> titles) {
        Company c = companyRepository.findById(company.getId())
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));
        Map<String, String> cleaned = new LinkedHashMap<>();
        if (titles != null) {
            for (Map.Entry<String, String> e : titles.entrySet()) {
                try {
                    LeadStatus st = LeadStatus.valueOf(e.getKey().trim().toUpperCase());
                    if (e.getValue() == null) {
                        continue;
                    }
                    String t = e.getValue().trim();
                    if (t.isEmpty()) {
                        continue;
                    }
                    if (t.length() > CRM_KANBAN_TITLE_MAX_LEN) {
                        t = t.substring(0, CRM_KANBAN_TITLE_MAX_LEN);
                    }
                    String def = STATUS_LABELS.get(st);
                    if (def != null && t.equals(def)) {
                        continue;
                    }
                    cleaned.put(st.name(), t);
                } catch (IllegalArgumentException ignored) {
                    // ignora chave inválida
                }
            }
        }
        try {
            if (cleaned.isEmpty()) {
                c.setCrmKanbanColumnTitles(null);
            } else {
                c.setCrmKanbanColumnTitles(objectMapper.writeValueAsString(cleaned));
            }
            companyRepository.save(c);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Erro ao salvar títulos do CRM", e);
        }
        return cleaned;
    }

    /**
     * Busca lead por ID
     */
    @Transactional(readOnly = true)
    public LeadResponse getLeadById(Company company, UUID id) {
        Lead lead = leadRepository.findByIdAndCompany(id, company)
                .orElseThrow(() -> new RuntimeException("Lead não encontrado"));
        return toResponse(lead);
    }

    /**
     * Cria um novo lead
     */
    @Transactional
    public LeadResponse createLead(Company company, LeadRequest request) {
        Lead lead = Lead.builder()
                .company(company)
                .name(request.getName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .status(request.getStatus() != null ? request.getStatus() : LeadStatus.NEW)
                .ownerName(request.getOwnerName())
                .notes(request.getNotes())
                .source(request.getSource())
                .estimatedValue(request.getEstimatedValue())
                .leadScore(request.getLeadScore() != null ? request.getLeadScore() : 0)
                .build();

        lead = leadRepository.save(lead);
        return toResponse(lead);
    }

    /**
     * Atualiza um lead existente
     */
    @Transactional
    public LeadResponse updateLead(Company company, UUID id, LeadRequest request) {
        Lead lead = leadRepository.findByIdAndCompany(id, company)
                .orElseThrow(() -> new RuntimeException("Lead não encontrado"));

        lead.setName(request.getName());
        lead.setEmail(request.getEmail());
        lead.setPhone(request.getPhone());
        if (request.getStatus() != null) {
            // Se o status foi alterado manualmente, marcar como qualificação manual
            if (!request.getStatus().equals(lead.getStatus())) {
                lead.setManuallyQualified(true);
            }
            lead.setStatus(request.getStatus());
        }
        lead.setOwnerName(request.getOwnerName());
        lead.setNotes(request.getNotes());
        lead.setSource(request.getSource());
        if (request.getEstimatedValue() != null) {
            lead.setEstimatedValue(request.getEstimatedValue());
        }
        if (request.getLeadScore() != null) {
            lead.setLeadScore(request.getLeadScore());
        }

        lead = leadRepository.save(lead);
        return toResponse(lead);
    }

    /**
     * Deleta um lead
     */
    @Transactional
    public void deleteLead(Company company, UUID id) {
        Lead lead = leadRepository.findByIdAndCompany(id, company)
                .orElseThrow(() -> new RuntimeException("Lead não encontrado"));

        chatMemoryService.clearHistory(id.toString());

        purgeWhatsAppThreadForLead(company, id);

        meetingRepository.clearLeadReference(id);
        broadcastRecipientRepository.clearLeadReference(id);

        if (lead.getProfilePictureUrl() != null && !lead.getProfilePictureUrl().isEmpty()) {
            supabaseStorageService.tryDeletePublicStorageObject(lead.getProfilePictureUrl());
        }

        leadRepository.deleteById(id);
    }

    /**
     * Remove completamente o atendimento WhatsApp do lead: follow-up, mensagens, mídia no Storage
     * e a conversa (some da lista).
     */
    private void purgeWhatsAppThreadForLead(Company company, UUID leadId) {
        Set<UUID> convIds = new LinkedHashSet<>();
        for (WhatsAppConversation c : conversationRepository.findByLead_Id(leadId)) {
            if (c.getCompany() != null && Objects.equals(c.getCompany().getId(), company.getId())) {
                convIds.add(c.getId());
            }
        }
        for (UUID cid : messageRepository.findDistinctConversationIdsByLeadId(leadId)) {
            conversationRepository.findById(cid).ifPresent(conv -> {
                if (conv.getCompany() != null && Objects.equals(conv.getCompany().getId(), company.getId())) {
                    convIds.add(cid);
                }
            });
        }
        for (UUID cid : convIds) {
            WhatsAppConversation conv = conversationRepository.findById(cid).orElse(null);
            if (conv == null) {
                continue;
            }
            for (String mediaUrl : messageRepository.findMediaUrlsByConversationId(conv.getId())) {
                supabaseStorageService.tryDeletePublicStorageObject(mediaUrl);
            }
            if (conv.getProfilePictureUrl() != null && !conv.getProfilePictureUrl().isEmpty()) {
                supabaseStorageService.tryDeletePublicStorageObject(conv.getProfilePictureUrl());
            }
            messageRepository.deleteByConversation(conv);
            followUpStatusRepository.findByConversationId(conv.getId()).ifPresent(followUpStatusRepository::delete);
            chatMemoryService.clearHistory(conv.getId().toString());
            conversationRepository.delete(conv);
        }
        messageRepository.deleteByLead_Id(leadId);
    }

    /**
     * Converte entidade para DTO
     */
    private LeadResponse toResponse(Lead lead) {
        return LeadResponse.builder()
                .id(lead.getId())
                .name(lead.getName())
                .email(lead.getEmail())
                .phone(lead.getPhone())
                .status(lead.getStatus().name())
                .statusLabel(STATUS_LABELS.getOrDefault(lead.getStatus(), lead.getStatus().name()))
                .ownerName(lead.getOwnerName())
                .notes(lead.getNotes())
                .source(lead.getSource())
                .trackId(lead.getTrackId())
                .trackSource(lead.getTrackSource())
                .utmSource(lead.getUtmSource())
                .utmMedium(lead.getUtmMedium())
                .utmCampaign(lead.getUtmCampaign())
                .utmContent(lead.getUtmContent())
                .utmTerm(lead.getUtmTerm())
                .estimatedValue(lead.getEstimatedValue())
                .leadScore(lead.getLeadScore() != null ? lead.getLeadScore() : 0)
                .profilePictureUrl(lead.getProfilePictureUrl())
                .createdAt(lead.getCreatedAt())
                .updatedAt(lead.getUpdatedAt())
                .build();
    }
}
