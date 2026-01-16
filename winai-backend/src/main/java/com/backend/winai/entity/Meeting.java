package com.backend.winai.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "meetings", schema = "winai")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Meeting {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lead_id")
    private Lead lead;

    @Column(nullable = false)
    private String title;

    @Column(name = "contact_name", nullable = false)
    private String contactName;

    @Column(name = "contact_email")
    private String contactEmail;

    @Column(name = "contact_phone")
    private String contactPhone;

    @Column(name = "meeting_date", nullable = false)
    private LocalDate meetingDate;

    @Column(name = "meeting_time", nullable = false)
    private LocalTime meetingTime;

    @Column(name = "duration_minutes")
    @Builder.Default
    private Integer durationMinutes = 30;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private MeetingStatus status = MeetingStatus.SCHEDULED;

    @Column(length = 2000)
    private String notes;

    @Column(name = "attendees_json", columnDefinition = "TEXT")
    private String attendeesJson;

    @Column(name = "scheduled_by")
    private String scheduledBy; // "IA" ou nome do usuário

    @Column(name = "meeting_link")
    private String meetingLink;

    @Column(name = "google_event_id")
    private String googleEventId;

    @Column(name = "manual_update")
    @Builder.Default
    private Boolean manualUpdate = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
