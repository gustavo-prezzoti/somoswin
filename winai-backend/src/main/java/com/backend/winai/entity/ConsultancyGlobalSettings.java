package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;

/** Configuração única (id=1) da aparência da consultoria para todos os clientes. */
@Entity
@Table(name = "consultancy_global_settings", schema = "winai")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsultancyGlobalSettings {

    /** Única linha da tabela — aparência da consultoria para todos os clientes. */
    public static final long SINGLETON_ID = 1L;

    @Id
    @Column(nullable = false)
    private Long id;

    @Column(name = "consultant_display_name", length = 500)
    private String consultantDisplayName;

    @Column(name = "consultant_role", length = 500)
    private String consultantRole;

    @Column(name = "consultant_avatar_url", columnDefinition = "TEXT")
    private String consultantAvatarUrl;

    @Column(name = "consultancy_client_kicker", length = 500)
    private String consultancyClientKicker;

    @Column(name = "consultancy_client_headline_prefix", length = 500)
    private String consultancyClientHeadlinePrefix;

    @Column(name = "consultancy_client_headline_accent", length = 255)
    private String consultancyClientHeadlineAccent;

    @Column(name = "consultancy_next_section_caption", length = 500)
    private String consultancyNextSectionCaption;

    @Column(name = "consultancy_request_card_title", length = 500)
    private String consultancyRequestCardTitle;

    @Column(name = "consultancy_request_card_description", columnDefinition = "TEXT")
    private String consultancyRequestCardDescription;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;
}
