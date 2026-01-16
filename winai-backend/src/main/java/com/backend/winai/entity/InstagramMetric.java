package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "instagram_metrics", schema = "winai")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InstagramMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "date", nullable = false)
    private LocalDate date;

    private Long impressions;
    private Long reach;

    @Column(name = "profile_views")
    private Long profileViews;

    @Column(name = "website_clicks")
    private Long websiteClicks;

    @Column(name = "follower_count")
    private Long followerCount;
}
