package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "google_ads_connections", schema = "winai")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GoogleAdsConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "refresh_token", columnDefinition = "TEXT")
    private String refreshToken;

    /** Customer ID numérico sem hífens (ex: 1234567890). */
    @Column(name = "customer_id", length = 32)
    private String customerId;

    /** MCC / manager account, opcional. */
    @Column(name = "login_customer_id", length = 32)
    private String loginCustomerId;

    @Column(name = "connected", nullable = false)
    private boolean connected;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;
}
