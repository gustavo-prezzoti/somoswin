package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "goal_tasks", schema = "winai")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GoalTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "goal_id", nullable = false)
    private Goal goal;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private Integer week;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private GoalTaskLevel level;

    @Column(nullable = false)
    @Builder.Default
    private Integer weight = 1;

    @Column(nullable = false)
    @Builder.Default
    private Boolean completed = false;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    private LocalDate deadline;

    @Column(name = "evidencia_obrigatoria", nullable = false)
    @Builder.Default
    private Boolean evidenciaObrigatoria = false;

    @Column(name = "evidencia_json", columnDefinition = "TEXT")
    private String evidenciaJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "task_status", nullable = false, length = 20)
    @Builder.Default
    private GoalTaskStatus taskStatus = GoalTaskStatus.pendente;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        syncStatus();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        syncStatus();
    }

    private void syncStatus() {
        if (Boolean.TRUE.equals(completed)) {
            taskStatus = GoalTaskStatus.concluido;
        } else if (taskStatus == null || taskStatus == GoalTaskStatus.concluido) {
            taskStatus = GoalTaskStatus.pendente;
        }
    }
}
