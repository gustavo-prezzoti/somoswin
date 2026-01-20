package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.ZonedDateTime;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "system_prompts", schema = "winai")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemPrompt {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String category; // ex: SOCIAL_MEDIA, PAID_TRAFFIC

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    private String description;

    @Builder.Default
    private Boolean isActive = true;

    @Builder.Default
    private Boolean isDefault = false;

    @CreationTimestamp
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    private ZonedDateTime updatedAt;
}