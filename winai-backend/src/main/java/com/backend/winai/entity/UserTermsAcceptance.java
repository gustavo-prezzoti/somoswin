package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.ZonedDateTime;
import java.util.UUID;

/**
 * Registra o aceite dos termos de serviço por cada usuário.
 * Armazena metadados para auditoria (IP, User Agent, timestamp).
 */
@Entity
@Table(name = "user_terms_acceptances", schema = "winai", uniqueConstraints = @UniqueConstraint(columnNames = {
        "user_id", "terms_of_service_id" }))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserTermsAcceptance {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "terms_of_service_id", nullable = false)
    private TermsOfService termsOfService;

    @CreationTimestamp
    @Column(name = "accepted_at", updatable = false)
    private ZonedDateTime acceptedAt;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;
}
