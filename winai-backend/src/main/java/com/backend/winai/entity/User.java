package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.ZonedDateTime;
import java.util.*;

@Entity
@Table(name = "users", schema = "winai")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private UserRole role = UserRole.USER;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "must_change_password")
    @Builder.Default
    private Boolean mustChangePassword = false;

    @Column(name = "email_verified")
    @Builder.Default
    private Boolean emailVerified = false;

    @Column(name = "email_verification_token")
    private String emailVerificationToken;

    @Column(name = "password_reset_token")
    private String passwordResetToken;

    @Column(name = "password_reset_expires")
    private ZonedDateTime passwordResetExpires;

    @Column(name = "last_login")
    private ZonedDateTime lastLogin;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "phone")
    private String phone;

    @Column(name = "job_title")
    private String jobTitle;

    /** Colaborador interno Amplia: acesso ao app sem empresa/assinatura. */
    @Column(name = "amplia_internal_staff")
    @Builder.Default
    private Boolean ampliaInternalStaff = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "amplia_staff_type")
    private AmpliaStaffType ampliaStaffType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "amplia_staff_role_id")
    private AmpliaStaffRole ampliaStaffRole;

    /** Ignora mapa granular de módulos do app cliente (exceto SUPER_ADMIN / papel empresa ADMIN já liberados). */
    @Column(name = "app_full_access")
    @Builder.Default
    private Boolean appFullAccess = false;

    /** Chaves alinhadas a CompanyAppModule; null = legado (todos os módulos permitidos). */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "app_module_grants", columnDefinition = "jsonb")
    private Map<String, Boolean> appModuleGrants;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;

    // UserDetails implementation
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return isActive;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return isActive;
    }

    /** Super admin ou colaborador interno Amplia não dependem de assinatura de empresa. */
    public boolean isSubscriptionExempt() {
        return role == UserRole.SUPER_ADMIN || Boolean.TRUE.equals(ampliaInternalStaff);
    }
}
