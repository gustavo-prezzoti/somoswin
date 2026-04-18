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

    @Column(name = "default_support_mode")
    @Builder.Default
    private String defaultSupportMode = "HUMAN"; // IA só após habilitar no admin

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

    // Método auxiliar para verificar se os campos obrigatórios estão preenchidos
    public boolean hasRequiredContractFields() {
        return contratante != null && !contratante.trim().isEmpty()
                && documento != null && !documento.trim().isEmpty()
                && emailContratante != null && !emailContratante.trim().isEmpty()
                && planEntity != null;
    }
}
