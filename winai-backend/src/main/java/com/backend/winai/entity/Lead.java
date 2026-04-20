package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "leads", schema = "winai", indexes = {
        @Index(name = "idx_lead_email", columnList = "email"),
        @Index(name = "idx_lead_phone", columnList = "phone"),
        @Index(name = "idx_lead_name", columnList = "name")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Lead {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = true)
    private Company company;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String email;

    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private LeadStatus status = LeadStatus.NEW;

    @Column(name = "owner_name")
    private String ownerName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_user_id")
    private User ownerUser;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(length = 500)
    private String source; // Origem do lead (campanha, orgânico, etc)

    @Column(name = "track_id", length = 255)
    private String trackId;

    @Column(name = "track_source", length = 2000)
    private String trackSource;

    @Column(name = "utm_source", length = 255)
    private String utmSource;

    @Column(name = "utm_medium", length = 255)
    private String utmMedium;

    @Column(name = "utm_campaign", length = 255)
    private String utmCampaign;

    @Column(name = "utm_content", length = 255)
    private String utmContent;

    @Column(name = "utm_term", length = 255)
    private String utmTerm;

    @Column(name = "estimated_value", precision = 14, scale = 2)
    private BigDecimal estimatedValue;

    @Column(name = "lead_score", nullable = false)
    @Builder.Default
    private Integer leadScore = 0;

    @Column(columnDefinition = "TEXT")
    private String aiSummary; // Memória de longo prazo da IA sobre este lead

    @Column(name = "last_summary_at")
    private LocalDateTime lastSummaryAt; // Controle para evitar atualizações excessivas

    @Column(name = "interaction_count")
    @Builder.Default
    private Integer interactionCount = 0; // Conta interações para gerar resumo a cada X mensagens

    @Column(name = "manually_qualified")
    @Builder.Default
    private Boolean manuallyQualified = false; // Flag para impedir IA de sobrescrever qualificação manual

    @Column(name = "profile_picture_url")
    private String profilePictureUrl;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
