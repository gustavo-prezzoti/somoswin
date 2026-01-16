package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_insights", schema = "winai")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIInsight {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(nullable = false)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(name = "suggestion_source")
    private String suggestionSource; // Ex: "Agente de Tráfego", "Agente SDR", "IA Social Media"

    @Enumerated(EnumType.STRING)
    @Column(name = "insight_type", nullable = false)
    private InsightType insightType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private InsightPriority priority = InsightPriority.MEDIUM;

    @Column(name = "action_url")
    private String actionUrl;

    @Column(name = "action_label")
    private String actionLabel;

    @Column(name = "is_read")
    @Builder.Default
    private Boolean isRead = false;

    @Column(name = "is_dismissed")
    @Builder.Default
    private Boolean isDismissed = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
