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

    /**
     * Se true, follow-ups são enviados periodicamente enquanto lead inativo.
     * Se false, apenas um follow-up é enviado.
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean recurring = false;

    /**
     * Intervalo em minutos entre follow-ups recorrentes.
     */
    @Column(name = "recurrence_minutes")
    @Builder.Default
    private Integer recurrenceMinutes = 1440; // Default: 1 dia

    /**
     * Máximo de follow-ups que podem ser enviados por conversa.
     */
    @Column(name = "max_followups")
    @Builder.Default
    private Integer maxFollowUps = 3;

    /**
     * Tipo de mensagem de follow-up:
     * - CONTINUATION: "Vamos continuar de onde paramos?"
     * - CHECKING_IN: "Oi! Tudo bem? Notei que ficou um tempo sem responder..."
     */
    @Column(name = "message_type", nullable = false)
    @Builder.Default
    private String messageType = "CHECKING_IN";

    /**
     * Mensagem customizada para follow-up (opcional).
     * Se null, usa o prompt padrão da IA.
     */
    @Column(name = "custom_message", length = 2000)
    private String customMessage;

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

    // ==========================================
    // Configurações de Notificação Handoff Humano
    // ==========================================

    /**
     * Se true, envia notificação WhatsApp quando lead solicitar atendimento humano.
     */
    @Column(name = "human_handoff_notification_enabled")
    @Builder.Default
    private Boolean humanHandoffNotificationEnabled = false;

    /**
     * Número de telefone que receberá a notificação de handoff humano.
     * Formato: 5511999999999 (DDI + DDD + número sem formatação)
     */
    @Column(name = "human_handoff_phone")
    private String humanHandoffPhone;

    /**
     * Mensagem customizada para notificação de handoff enviada ao AGENTE
     * (opcional).
     * Placeholders disponíveis: {leadName}, {phoneNumber}, {conversationId}
     */
    @Column(name = "human_handoff_message", length = 1000)
    private String humanHandoffMessage;

    /**
     * Mensagem enviada ao LEAD quando solicitada a escala para humano.
     */
    @Column(name = "human_handoff_client_message", length = 1000)
    private String humanHandoffClientMessage;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;
}
