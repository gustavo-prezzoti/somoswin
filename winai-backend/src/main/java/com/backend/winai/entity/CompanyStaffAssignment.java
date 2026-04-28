package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "company_staff_assignment",
        schema = "winai",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_company_staff_assignment",
                columnNames = {"company_id", "staff_user_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanyStaffAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "staff_user_id", nullable = false)
    private User staffUser;

    @Column(name = "created_at", nullable = false)
    private ZonedDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    private User createdByUser;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = ZonedDateTime.now();
        }
    }
}
