package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "crm_lead_tags", schema = "winai")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrmLeadTag {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (name != null) {
            name = name.trim();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        if (name != null) {
            name = name.trim();
        }
    }
}
