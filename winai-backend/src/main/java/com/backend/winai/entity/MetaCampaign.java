package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "meta_campaigns", schema = "winai")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MetaCampaign {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "meta_id", unique = true, nullable = false)
    private String metaId;

    private String name;
    private String status;
    private String objective;

    @Column(name = "start_time")
    private ZonedDateTime startTime;

    @Column(name = "stop_time")
    private ZonedDateTime stopTime;

    @UpdateTimestamp
    private ZonedDateTime updatedAt;
}
