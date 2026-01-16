package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "meta_insights", schema = "winai")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MetaInsight {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "date", nullable = false)
    private LocalDate date;

    @Column(name = "level")
    private String level; // campaign, adset, ad, account

    @Column(name = "external_id")
    private String externalId;

    private Double spend;
    private Long impressions;
    private Long clicks;
    private Long reach;

    @Column(name = "inline_link_clicks")
    private Long inlineLinkClicks;

    @Column(name = "conversions")
    private Long conversions;
}
