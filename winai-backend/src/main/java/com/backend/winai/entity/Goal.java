package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "goals", schema = "winai")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Goal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(nullable = false)
    private String title;

    @Column(length = 500)
    private String description;

    @Column(name = "target_value")
    private Integer targetValue;

    @Column(name = "current_value")
    @Builder.Default
    private Integer currentValue = 0;

    @Column(name = "progress_percentage")
    @Builder.Default
    private Integer progressPercentage = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "goal_type", nullable = false)
    private GoalType goalType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private GoalStatus status = GoalStatus.ACTIVE;

    @Column(name = "is_highlighted")
    @Builder.Default
    private Boolean isHighlighted = false;

    @Column(name = "year_cycle")
    private Integer yearCycle;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    /** Classe CSS para o dot / barra (ex.: bg-emerald-500). */
    @Column(length = 64)
    private String color;

    @Column(name = "prazo_dias")
    @Builder.Default
    private Integer prazoDias = 30;

    @Column(length = 40)
    private String scenario;

    @Column(length = 16)
    @Builder.Default
    private String unit = "%";

    /** Progresso de resultado (KPI) — opcional; o progresso principal continua em progress_percentage. */
    @Column(name = "progresso_resultado")
    private Integer progressoResultado;

    @OneToMany(mappedBy = "goal", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, id ASC")
    @Builder.Default
    private List<GoalTask> goalTasks = new ArrayList<>();

    @OneToMany(mappedBy = "goal", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC, id ASC")
    @Builder.Default
    private List<GoalCheckpoint> goalCheckpoints = new ArrayList<>();

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        updateProgress();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        updateProgress();
    }

    private void updateProgress() {
        if (targetValue != null && targetValue > 0 && currentValue != null) {
            this.progressPercentage = (int) Math.min(100, (currentValue * 100.0 / targetValue));
        }
    }
}
