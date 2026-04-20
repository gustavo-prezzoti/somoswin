package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "amplia_staff_roles", schema = "winai")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AmpliaStaffRole {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 120)
    private String name;

    @Column(columnDefinition = "text")
    private String description;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    /**
     * Quando true, ignora permissionsJson para autorização (acesso a todos os módulos).
     */
    @Column(name = "full_access", nullable = false)
    @Builder.Default
    private Boolean fullAccess = false;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "permissions_json", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Boolean> permissionsJson = new HashMap<>();

    /**
     * Perfis seed (VENDEDOR, CONSULTOR, GESTOR). Papéis customizados podem deixar null.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "legacy_staff_type", length = 32)
    private AmpliaStaffType legacyStaffType;

    @Column(name = "created_at")
    private ZonedDateTime createdAt;

    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;

    @PrePersist
    void prePersist() {
        ZonedDateTime now = ZonedDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = ZonedDateTime.now();
    }
}
