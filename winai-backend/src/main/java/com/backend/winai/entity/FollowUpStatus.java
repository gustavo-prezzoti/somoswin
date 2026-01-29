package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;
import java.util.UUID;

/**
 * Status de follow-up por conversa.
 * Controla quantos follow-ups foram enviados e quando enviar o próximo.
 */
@Entity
@Table(name = "followup_status", schema = "winai", indexes = {
        @Index(name = "idx_followup_status_next_at", columnList = "next_followup_at"),
        @Index(name = "idx_followup_status_conversation", columnList = "conversation_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FollowUpStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false, unique = true)
    private WhatsAppConversation conversation;

    /**
     * Timestamp da última mensagem na conversa.
     */
    @Column(name = "last_message_at", nullable = false)
    private ZonedDateTime lastMessageAt;

    /**
     * Quem enviou a última mensagem: "LEAD" ou "AI"
     */
    @Column(name = "last_message_from", nullable = false)
    private String lastMessageFrom;

    /**
     * Quantidade de follow-ups já enviados para esta conversa.
     */
    @Column(name = "followup_count", nullable = false)
    @Builder.Default
    private Integer followUpCount = 0;

    /**
     * Quando foi enviado o último follow-up.
     */
    @Column(name = "last_followup_at")
    private ZonedDateTime lastFollowUpAt;

    /**
     * Quando deve ser enviado o próximo follow-up.
     * Null se não há follow-up agendado.
     */
    @Column(name = "next_followup_at")
    private ZonedDateTime nextFollowUpAt;

    /**
     * Se true, follow-up está pausado manualmente para esta conversa.
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean paused = false;

    /**
     * Se true, conversa está elegível para follow-up.
     * False quando lead respondeu recentemente ou foi finalizada.
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean eligible = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;
}
