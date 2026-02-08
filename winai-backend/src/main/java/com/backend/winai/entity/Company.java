package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;
import java.util.UUID;

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
    @JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
    private Plan planEntity;

    @Enumerated(EnumType.STRING)
    @Column(name = "plan_type", nullable = false, columnDefinition = "varchar(255) default 'STARTER'")
    @Builder.Default
    private UserPlan plan = UserPlan.STARTER;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(255) default 'PENDING'")
    @Builder.Default
    private AccountStatus status = AccountStatus.PENDING;

    @Column(name = "default_support_mode")
    @Builder.Default
    private String defaultSupportMode = "IA"; // IA ou HUMAN

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;

    // Método auxiliar para verificar se os campos obrigatórios estão preenchidos
    public boolean hasRequiredContractFields() {
        return contratante != null && !contratante.trim().isEmpty()
                && documento != null && !documento.trim().isEmpty()
                && emailContratante != null && !emailContratante.trim().isEmpty()
                && planEntity != null;
    }
}
