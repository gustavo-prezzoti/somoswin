package com.backend.winai.entity;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "company_strategic_diagnosis", schema = "winai")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanyStrategicDiagnosis {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false, unique = true)
    private Company company;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "draft_answers_json", columnDefinition = "jsonb")
    private JsonNode draftAnswersJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "draft_activities_json", columnDefinition = "jsonb")
    private JsonNode draftActivitiesJson;

    @Column(name = "draft_project_start_date")
    private LocalDate draftProjectStartDate;

    @Column(name = "draft_current_step", nullable = false)
    @Builder.Default
    private Integer draftCurrentStep = -1;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "published_answers_json", columnDefinition = "jsonb")
    private JsonNode publishedAnswersJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "published_activities_json", columnDefinition = "jsonb")
    private JsonNode publishedActivitiesJson;

    @Column(name = "published_project_start_date")
    private LocalDate publishedProjectStartDate;

    @Column(name = "published_canal_prioritario", length = 64)
    private String publishedCanalPrioritario;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "published_metrics_json", columnDefinition = "jsonb")
    private JsonNode publishedMetricsJson;

    @Column(name = "published_at")
    private ZonedDateTime publishedAt;

    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;

    @Column(name = "updated_by_user_id")
    private UUID updatedByUserId;

    @PrePersist
    void prePersist() {
        if (updatedAt == null) {
            updatedAt = ZonedDateTime.now();
        }
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = ZonedDateTime.now();
    }
}
