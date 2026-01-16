package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "companies", schema = "winai")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class Company {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    private String segment;

    private String whatsapp;

    @Column(name = "lead_volume")
    private String leadVolume;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(255) default 'STARTER'")
    @Builder.Default
    private UserPlan plan = UserPlan.STARTER;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(255) default 'PENDING'")
    @Builder.Default
    private AccountStatus status = AccountStatus.PENDING;

    @Column(nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    private Boolean essencialis = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;
}
