package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "goal_checkpoints", schema = "winai")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GoalCheckpoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "goal_id", nullable = false)
    private Goal goal;

    @Column(name = "data_prevista", nullable = false)
    private LocalDate dataPrevista;

    @Column(name = "data_realizada")
    private LocalDate dataRealizada;

    private Integer semana;

    @Column(nullable = false, length = 30)
    private String status;

    @Column(name = "analise_ia_json", columnDefinition = "TEXT")
    private String analiseIaJson;

    @Column(name = "ajustes_sugeridos_json", columnDefinition = "TEXT")
    private String ajustesSugeridosJson;

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
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
