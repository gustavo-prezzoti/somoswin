package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.UUID;


@Entity
@Table(name = "agendamento_config", schema = "winai", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "company_id" })
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgendamentoConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(nullable = false)
    @Builder.Default
    private Boolean enabled = false;

    @Column(name = "start_time", nullable = false)
    @Builder.Default
    private java.time.LocalTime startTime = java.time.LocalTime.of(9, 0);

    @Column(name = "end_time", nullable = false)
    @Builder.Default
    private java.time.LocalTime endTime = java.time.LocalTime.of(18, 0);

    @Column(name = "slot_duration_minutes", nullable = false)
    @Builder.Default
    private Integer slotDurationMinutes = 30;

    /** Dias de atendimento: MONDAY,TUESDAY,...,SUNDAY. Null/vazio = todos os dias. */
    @Column(name = "attendance_days", length = 100)
    private String attendanceDays;

    @Column(name = "exclude_holidays", nullable = false)
    @Builder.Default
    private Boolean excludeHolidays = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;
}
