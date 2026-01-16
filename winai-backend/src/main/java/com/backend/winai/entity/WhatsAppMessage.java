package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "whatsapp_messages", schema = "winai")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WhatsAppMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private WhatsAppConversation conversation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lead_id")
    private Lead lead;

    @Column(name = "message_id", unique = true)
    private String messageId; // ID da mensagem no WhatsApp (ex: 3EB0DB936F6657472249F9)

    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "from_me", nullable = false)
    @Builder.Default
    private Boolean fromMe = false;

    @Column(name = "message_type")
    private String messageType; // text, audio, image, video, document, etc.

    @Column(name = "media_type")
    private String mediaType;

    @Column(name = "media_url")
    private String mediaUrl;

    @Column(name = "media_duration")
    private Integer mediaDuration;

    @Column(name = "message_timestamp", nullable = false)
    private Long messageTimestamp;

    @Column(name = "status")
    private String status; // sent, delivered, read, failed

    @Column(name = "is_group")
    @Builder.Default
    private Boolean isGroup = false;

    @Column(name = "quoted_message_id")
    private String quotedMessageId;

    @Column(name = "transcription")
    private String transcription; // Para mensagens de áudio

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;
}
