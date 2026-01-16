package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "meta_ads", schema = "winai")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MetaAd {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ad_set_id")
    private MetaAdSet adSet;

    @Column(name = "meta_id", unique = true, nullable = false)
    private String metaId;

    private String name;
    private String status;

    @Column(name = "preview_url", columnDefinition = "TEXT")
    private String previewUrl;

    @UpdateTimestamp
    private ZonedDateTime updatedAt;
}
