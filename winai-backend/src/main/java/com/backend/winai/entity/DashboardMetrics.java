package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "dashboard_metrics", schema = "winai")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardMetrics {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(nullable = false)
    private LocalDate date;

    // Métricas principais
    @Column(name = "leads_captured")
    @Builder.Default
    private Integer leadsCaptured = 0;

    @Column(name = "cpl_average", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal cplAverage = BigDecimal.ZERO;

    @Column(name = "conversion_rate", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal conversionRate = BigDecimal.ZERO;

    @Column(name = "roi", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal roi = BigDecimal.ZERO;

    // Métricas do gráfico
    @Column(name = "leads_current_period")
    @Builder.Default
    private Integer leadsCurrentPeriod = 0;

    @Column(name = "leads_previous_period")
    @Builder.Default
    private Integer leadsPreviousPeriod = 0;

    // Score de performance
    @Column(name = "performance_score")
    @Builder.Default
    private Integer performanceScore = 0;

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
