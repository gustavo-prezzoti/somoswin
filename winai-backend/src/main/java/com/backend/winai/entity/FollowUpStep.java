package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonBackReference;

import java.util.UUID;

@Entity
@Table(name = "followup_steps", schema = "winai")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FollowUpStep {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "followup_config_id", nullable = false)
    @JsonBackReference
    private FollowUpConfig followUpConfig;

    @Column(name = "step_order", nullable = false)
    private Integer stepOrder;

    /**
     * Delay in minutes from the *previous* step (or from inactivity start for step
     * 1).
     */
    @Column(name = "delay_minutes", nullable = false)
    private Integer delayMinutes;

    @Column(name = "message_type", nullable = false)
    private String messageType; // "AI" or "CUSTOM"

    @Column(name = "custom_message", length = 2000)
    private String customMessage;

    @Column(name = "ai_prompt", length = 2000)
    private String aiPrompt;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;
}
