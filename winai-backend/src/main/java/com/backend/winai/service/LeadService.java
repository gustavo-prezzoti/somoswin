package com.backend.winai.service;

import com.backend.winai.dto.request.LeadRequest;
import com.backend.winai.dto.response.LeadResponse;
import com.backend.winai.entity.Company;
import com.backend.winai.entity.Lead;
import com.backend.winai.entity.LeadStatus;
import com.backend.winai.repository.LeadRepository;
import com.backend.winai.repository.WhatsAppMessageRepository;
import com.backend.winai.repository.WhatsAppConversationRepository;
import com.backend.winai.repository.MeetingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LeadService {

    private final LeadRepository leadRepository;
    private final WhatsAppMessageRepository messageRepository;
    private final WhatsAppConversationRepository conversationRepository;
    private final MeetingRepository meetingRepository;
    private final ChatMemoryService chatMemoryService;

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
        leadRepository.findByIdAndCompany(id, company)
                .orElseThrow(() -> new RuntimeException("Lead não encontrado"));

        chatMemoryService.clearHistory(id.toString());

        // Limpar referências em outras tabelas para evitar violação de chave estrangeira
        messageRepository.clearLeadReference(id);
        conversationRepository.clearLeadReference(id);
        meetingRepository.clearLeadReference(id);

        leadRepository.deleteById(id);
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
