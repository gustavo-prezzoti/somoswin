package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "meta_connections", schema = "winai")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MetaConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "access_token", columnDefinition = "TEXT")
    private String accessToken;

    @Column(name = "meta_user_id")
    private String metaUserId;

    @Column(name = "token_expires_at")
    private ZonedDateTime tokenExpiresAt;

    @Column(name = "is_long_lived")
    private boolean isLongLived;

    @Column(name = "ad_account_id")
    private String adAccountId;

    @Column(name = "page_id")
    private String pageId;

    @Column(name = "instagram_business_id")
    private String instagramBusinessId;

    @Column(name = "business_id")
    private String businessId;

    @Column(name = "is_connected")
    private boolean isConnected;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;
}
