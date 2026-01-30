package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "global_notification_configs", schema = "winai")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GlobalNotificationConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false, unique = true)
    private Company company;

    // Human Handoff Settings
    @Column(name = "human_handoff_notification_enabled")
    @Builder.Default
    private Boolean humanHandoffNotificationEnabled = false;

    @Column(name = "human_handoff_phone")
    private String humanHandoffPhone;

    @Column(name = "human_handoff_message", length = 1000)
    private String humanHandoffMessage;

    @Column(name = "human_handoff_client_message", length = 1000)
    private String humanHandoffClientMessage;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;
}
