package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "company_paid_traffic_targets", schema = "winai")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyPaidTrafficTarget {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    /** Formato yyyy-MM */
    @Column(name = "year_month", nullable = false, length = 7)
    private String yearMonth;

    @Column(name = "investment_goal", precision = 14, scale = 2)
    private BigDecimal investmentGoal;

    @Column(name = "roas_goal", precision = 10, scale = 2)
    private BigDecimal roasGoal;

    @Column(name = "cpl_goal", precision = 10, scale = 2)
    private BigDecimal cplGoal;

    @Column(name = "ctr_goal", precision = 10, scale = 4)
    private BigDecimal ctrGoal;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;
}
