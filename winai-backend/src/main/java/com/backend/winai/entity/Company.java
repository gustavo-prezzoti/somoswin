package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "companies", schema = "winai")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class Company {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    // Razão Social / Nome do Contratante (obrigatório para termos)
    @Column(name = "contratante")
    private String contratante;

    // CNPJ/CPF do contratante (obrigatório para termos)
    @Column(name = "documento")
    private String documento;

    // Email do contratante (obrigatório para termos)
    @Column(name = "email_contratante")
    private String emailContratante;

    private String segment;

    private String whatsapp;

    @Column(name = "lead_volume")
    private String leadVolume;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id")
    @JsonIgnore
    private Plan planEntity;

    @Enumerated(EnumType.STRING)
    @Column(name = "plan_type", nullable = false)
    @Builder.Default
    private UserPlan plan = UserPlan.STARTER;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AccountStatus status = AccountStatus.PENDING;

    /** null = sem agente configurado / não definido; "IA" ou "HUMAN" quando explícito. */
    @Column(name = "default_support_mode")
    private String defaultSupportMode;

    // Asaas Integration
    @Column(name = "asaas_customer_id")
    private String asaasCustomerId;

    @Column(name = "asaas_subscription_id")
    private String asaasSubscriptionId;

    @Column(name = "subscription_status")
    @Builder.Default
    private String subscriptionStatus = "PENDING";

    @Column(name = "subscription_due_date")
    private LocalDate subscriptionDueDate;

    @Column(name = "subscription_start_date")
    private LocalDate subscriptionStartDate;

    @Column(name = "subscription_end_date")
    private LocalDate subscriptionEndDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pending_plan_id")
    @JsonIgnore
    private Plan pendingPlan;

    @Column(name = "pending_plan_payment_id")
    private String pendingPlanPaymentId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;

    @Column(name = "consultant_display_name")
    private String consultantDisplayName;

    @Column(name = "consultant_role")
    private String consultantRole;

    @Column(name = "consultant_avatar_url", columnDefinition = "TEXT")
    private String consultantAvatarUrl;

    /** Textos da tela "Consultoria Estratégica" no app do cliente (opcionais). */
    @Column(name = "consultancy_client_kicker", length = 500)
    private String consultancyClientKicker;

    @Column(name = "consultancy_client_headline_prefix", length = 500)
    private String consultancyClientHeadlinePrefix;

    @Column(name = "consultancy_client_headline_accent", length = 255)
    private String consultancyClientHeadlineAccent;

    @Column(name = "consultancy_next_section_caption", length = 500)
    private String consultancyNextSectionCaption;

    @Column(name = "consultancy_request_card_title", length = 500)
    private String consultancyRequestCardTitle;

    @Column(name = "consultancy_request_card_description", columnDefinition = "TEXT")
    private String consultancyRequestCardDescription;

    @Column(name = "website", length = 1024)
    private String website;

    @Column(name = "instagram_handle", length = 255)
    private String instagramHandle;

    @Column(name = "revenue_range", length = 255)
    private String revenueRange;

    @Column(name = "team_size", length = 64)
    private String teamSize;

    @Column(name = "city_state", length = 255)
    private String cityState;

    /** JSON: títulos customizados das colunas do funil CRM (chaves = LeadStatus.name()). */
    @Column(name = "crm_kanban_column_titles", columnDefinition = "TEXT")
    private String crmKanbanColumnTitles;

    @Column(name = "acq_utm_source", length = 255)
    private String acqUtmSource;

    @Column(name = "acq_utm_medium", length = 255)
    private String acqUtmMedium;

    @Column(name = "acq_utm_campaign", length = 255)
    private String acqUtmCampaign;

    @Column(name = "acq_utm_content", length = 255)
    private String acqUtmContent;

    @Column(name = "acq_utm_term", length = 255)
    private String acqUtmTerm;

    @Column(name = "acq_gclid", length = 1024)
    private String acqGclid;

    @Column(name = "acq_fbclid", length = 2048)
    private String acqFbclid;

    @Column(name = "acq_msclkid", length = 1024)
    private String acqMsclkid;

    @Column(name = "acq_captured_at")
    private ZonedDateTime acqCapturedAt;

    // Método auxiliar para verificar se os campos obrigatórios estão preenchidos
    public boolean hasRequiredContractFields() {
        return contratante != null && !contratante.trim().isEmpty()
                && documento != null && !documento.trim().isEmpty()
                && emailContratante != null && !emailContratante.trim().isEmpty()
                && planEntity != null;
    }
}
