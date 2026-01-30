package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "whatsapp_conversations", schema = "winai")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WhatsAppConversation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = true)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lead_id")
    private Lead lead;

    @Column(name = "phone_number", nullable = false)
    private String phoneNumber; // Número formatado (ex: 5549991679923)

    @Column(name = "wa_chatid")
    private String waChatId; // ID do chat no WhatsApp

    @Column(name = "contact_name")
    private String contactName;

    @Column(name = "unread_count")
    @Builder.Default
    private Integer unreadCount = 0;

    @Column(name = "last_message_text")
    private String lastMessageText;

    @Column(name = "last_message_timestamp")
    private Long lastMessageTimestamp;

    @Column(name = "is_archived")
    @Builder.Default
    private Boolean isArchived = false;

    @Column(name = "is_blocked")
    @Builder.Default
    private Boolean isBlocked = false;

    @Column(name = "uazap_instance")
    private String uazapInstance; // Nome da instância no Uazap

    @Column(name = "uazap_token")
    private String uazapToken; // Token da instância

    @Column(name = "uazap_base_url")
    private String uazapBaseUrl; // Base URL da API (ex: https://somoswin.uazapi.com)

    @Column(name = "profile_picture_url")
    private String profilePictureUrl;

    @Column(name = "support_mode")
    @Builder.Default
    private String supportMode = "IA"; // IA ou HUMAN

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;
}
