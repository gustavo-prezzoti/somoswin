package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "plans", schema = "winai")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Plan {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false)
    private String displayName;

    @Column(nullable = false)
    private BigDecimal price;

    @Column(name = "setup_fee", nullable = false)
    private BigDecimal setupFee;

    @Column(name = "lead_limit")
    private Integer leadLimit; // null = unlimited

    @Column(name = "user_limit")
    private Integer userLimit; // null = unlimited

    @Column(name = "whatsapp_limit", nullable = false)
    @Builder.Default
    private Integer whatsappLimit = 1;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "asaas_plan_id")
    private String asaasPlanId;

    @Column(columnDefinition = "TEXT")
    private String description;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;
}
