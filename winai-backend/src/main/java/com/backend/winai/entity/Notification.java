package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "notifications", schema = "winai")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(nullable = false)
    @Builder.Default
    private Boolean read = false;

    @Column(name = "notification_type")
    private String type; // INFO, SUCCESS, WARNING, ERROR

    @Column(name = "related_entity_type")
    private String relatedEntityType; // MEETING, LEAD, CAMPAIGN, etc.

    @Column(name = "related_entity_id")
    private UUID relatedEntityId;

    @Column(name = "action_url")
    private String actionUrl;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;
}

