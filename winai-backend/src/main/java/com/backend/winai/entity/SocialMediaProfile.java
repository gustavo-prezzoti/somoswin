package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "social_media_profile", schema = "winai")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SocialMediaProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false, unique = true)
    private Company company;

    // Identities (Brand)
    @Column(name = "name_negocio")
    private String nameNegocio;

    @Column(name = "nicho_primario")
    private String nichoPrimario;

    @Column(columnDefinition = "TEXT")
    private String subnichos;

    @Column(name = "proposta_valor", columnDefinition = "TEXT")
    private String propostaValor;

    @Column(name = "historia_marca", columnDefinition = "TEXT")
    private String historiaMarca;

    @Column(columnDefinition = "TEXT")
    private String valores;

    @Column(name = "tom_voz", columnDefinition = "TEXT")
    private String tomVoz;

    // Audience
    @Column(name = "avatar_detalhado", columnDefinition = "TEXT")
    private String avatarDetalhado;

    @Column(name = "dores_especificas", columnDefinition = "TEXT")
    private String doresEspecificas;

    @Column(name = "desejos_sonhos", columnDefinition = "TEXT")
    private String desejosSonhos;

    @Column(name = "linguagem_nativa", columnDefinition = "TEXT")
    private String linguagemNativa;

    // Profile JSON storage for flexibility
    @Column(name = "raw_profile_data", columnDefinition = "TEXT")
    private String rawProfileData; // Stores the 5 blocks as a complete JSON

    @Builder.Default
    @Column(name = "is_completed")
    private boolean isCompleted = false;

    @CreationTimestamp
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    private ZonedDateTime updatedAt;
}
