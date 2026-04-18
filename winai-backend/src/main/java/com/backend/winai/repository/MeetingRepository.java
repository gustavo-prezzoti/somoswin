package com.backend.winai.repository;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.Meeting;
import com.backend.winai.entity.MeetingKind;
import com.backend.winai.entity.MeetingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MeetingRepository extends JpaRepository<Meeting, UUID> {

        @Modifying(flushAutomatically = true, clearAutomatically = true)
        @Query("UPDATE Meeting m SET m.lead = null WHERE m.lead.id = :leadId")
        void clearLeadReference(@Param("leadId") UUID leadId);

        List<Meeting> findByCompanyAndMeetingDateBetweenOrderByMeetingDateAscMeetingTimeAsc(
                        Company company, LocalDate startDate, LocalDate endDate);

        List<Meeting> findByCompanyAndMeetingDateOrderByMeetingTimeAsc(Company company, LocalDate date);

        Optional<Meeting> findByIdAndCompany(UUID id, Company company);

        long countByCompanyAndStatus(Company company, MeetingStatus status);

        @Query("SELECT COUNT(m) FROM Meeting m WHERE m.company = :company AND m.status = 'COMPLETED'")
        long countCompletedByCompany(@Param("company") Company company);

        @Query("SELECT COUNT(m) FROM Meeting m WHERE m.company = :company AND m.status IN ('COMPLETED', 'NO_SHOW')")
        long countFinishedByCompany(@Param("company") Company company);

        @Query("SELECT m FROM Meeting m WHERE m.company = :company AND m.meetingDate >= :startDate AND m.meetingDate <= :endDate ORDER BY m.meetingDate, m.meetingTime")
        List<Meeting> findByCompanyAndDateRange(@Param("company") Company company,
                        @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate);

        List<Meeting> findByCompanyAndGoogleEventIdIsNotNull(Company company);

        @Query("SELECT m FROM Meeting m WHERE m.company = :company AND m.meetingDate >= :today " +
                "AND m.status IN ('SCHEDULED', 'CONFIRMED') " +
                "AND ((:leadId IS NOT NULL AND m.lead.id = :leadId) OR (:phone IS NOT NULL AND :phone <> '' AND m.contactPhone = :phone)) " +
                "ORDER BY m.meetingDate, m.meetingTime")
        List<Meeting> findUpcomingByLeadOrPhone(@Param("company") Company company, @Param("leadId") UUID leadId,
                @Param("phone") String phone, @Param("today") java.time.LocalDate today);

        void deleteByCompany(Company company);

        @Query("SELECT m FROM Meeting m WHERE m.company = :company AND m.meetingKind = :kind "
                        + "AND m.status IN ('SCHEDULED', 'CONFIRMED') "
                        + "AND (m.meetingDate > :today OR (m.meetingDate = :today AND m.meetingTime >= :nowTime)) "
                        + "ORDER BY m.meetingDate ASC, m.meetingTime ASC")
        List<Meeting> findUpcomingConsultancy(@Param("company") Company company, @Param("kind") MeetingKind kind,
                        @Param("today") LocalDate today, @Param("nowTime") LocalTime nowTime);

        @Query("SELECT m FROM Meeting m WHERE m.company = :company AND m.meetingKind = :kind "
                        + "AND m.status <> 'CANCELLED' "
                        + "AND (m.meetingDate < :today OR m.status IN ('COMPLETED', 'NO_SHOW')) "
                        + "ORDER BY m.meetingDate DESC, m.meetingTime DESC")
        List<Meeting> findConsultancyHistory(@Param("company") Company company, @Param("kind") MeetingKind kind,
                        @Param("today") LocalDate today);

        List<Meeting> findByCompanyAndMeetingKindOrderByMeetingDateDescMeetingTimeDesc(Company company,
                        MeetingKind kind);

        List<Meeting> findByCompanyAndLead_IdAndMeetingKindOrderByCreatedAtDesc(Company company, UUID leadId,
                        MeetingKind kind);
}
