package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;
import java.util.UUID;

/**
 * Configuração de Follow-up por empresa.
 * Define regras para envio automático de mensagens de acompanhamento.
 */
@Entity
@Table(name = "followup_configs", schema = "winai")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FollowUpConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false, unique = true)
    private Company company;

    @Column(nullable = false)
    @Builder.Default
    private Boolean enabled = false;

    /**
     * Tempo de inatividade em minutos antes de disparar follow-up.
     * Ex: 1440 = 1 dia, 60 = 1 hora
     */
    @Column(name = "inactivity_minutes", nullable = false)
    @Builder.Default
    private Integer inactivityMinutes = 1440; // Default: 1 dia

    @OneToMany(mappedBy = "followUpConfig", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("stepOrder ASC")
    @Builder.Default
    private java.util.List<FollowUpStep> steps = new java.util.ArrayList<>();

    /**
     * Se true, considera última mensagem do LEAD para calcular inatividade.
     */
    @Column(name = "trigger_on_lead_message", nullable = false)
    @Builder.Default
    private Boolean triggerOnLeadMessage = true;

    /**
     * Se true, considera última mensagem da IA para calcular inatividade.
     */
    @Column(name = "trigger_on_ai_response", nullable = false)
    @Builder.Default
    private Boolean triggerOnAiResponse = true;

    /**
     * Horário inicial para envio (0-23).
     */
    @Column(name = "start_hour")
    @Builder.Default
    private Integer startHour = 8;

    /**
     * Horário final para envio (0-23).
     */
    @Column(name = "end_hour")
    @Builder.Default
    private Integer endHour = 22;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;
}
