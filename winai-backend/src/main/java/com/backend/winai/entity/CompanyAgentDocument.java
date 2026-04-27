package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "company_agent_documents", schema = "winai")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanyAgentDocument {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(name = "storage_bucket", nullable = false, length = 128)
    private String storageBucket;

    @Column(name = "storage_path", nullable = false, columnDefinition = "TEXT")
    private String storagePath;

    @Column(name = "public_url", nullable = false, columnDefinition = "TEXT")
    private String publicUrl;

    @Column(name = "mime_type", nullable = false)
    private String mimeType;

    @Column(name = "original_filename", length = 1024)
    private String originalFilename;

    @Column(name = "file_size")
    private Long fileSize;

    /** Quando enviar este arquivo (texto livre; entra no catálogo do agente). */
    @Column(name = "send_when_instructions", columnDefinition = "TEXT")
    private String sendWhenInstructions;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;
}
