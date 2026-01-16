package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "meta_ad_sets", schema = "winai")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MetaAdSet {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id")
    private MetaCampaign campaign;

    @Column(name = "meta_id", unique = true, nullable = false)
    private String metaId;

    private String name;
    private String status;

    @Column(name = "daily_budget")
    private Long dailyBudget;

    @Column(name = "lifetime_budget")
    private Long lifetimeBudget;

    @UpdateTimestamp
    private ZonedDateTime updatedAt;
}
