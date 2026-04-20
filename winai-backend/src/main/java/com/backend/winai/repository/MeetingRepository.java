package com.backend.winai.repository;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.Meeting;
import com.backend.winai.entity.MeetingKind;
import com.backend.winai.entity.MeetingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

        @Query("SELECT m FROM Meeting m JOIN FETCH m.company WHERE m.meetingDate >= :start AND m.meetingDate <= :end ORDER BY m.meetingDate ASC, m.meetingTime ASC")
        List<Meeting> findAllByMeetingDateBetweenWithCompany(@Param("start") LocalDate start,
                        @Param("end") LocalDate end);

        @Query("SELECT COUNT(m) FROM Meeting m WHERE m.meetingDate >= :start AND m.meetingDate <= :end")
        long countByMeetingDateBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

        Page<Meeting> findByMeetingKindOrderByCreatedAtDesc(MeetingKind meetingKind, Pageable pageable);

        @Query(value = "SELECT m FROM Meeting m JOIN m.company c LEFT JOIN m.lead l WHERE m.meetingKind = :kind AND ("
                        + "LOWER(m.title) LIKE LOWER(CONCAT('%', :q, '%')) OR "
                        + "LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%')) OR "
                        + "LOWER(COALESCE(l.name,'')) LIKE LOWER(CONCAT('%', :q, '%')))",
                        countQuery = "SELECT count(m) FROM Meeting m JOIN m.company c LEFT JOIN m.lead l WHERE m.meetingKind = :kind AND ("
                                        + "LOWER(m.title) LIKE LOWER(CONCAT('%', :q, '%')) OR "
                                        + "LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%')) OR "
                                        + "LOWER(COALESCE(l.name,'')) LIKE LOWER(CONCAT('%', :q, '%')))")
        Page<Meeting> searchByMeetingKindAndQuery(@Param("kind") MeetingKind kind, @Param("q") String q,
                        Pageable pageable);

        /**
         * Agenda admin — sem texto de busca (evita LOWER() no SQL: PostgreSQL pode avaliar o OR
         * mesmo com :q nulo e colunas text/varchar mal tipadas como bytea disparam
         * {@code function lower(bytea) does not exist}).
         */
        @Query("SELECT m FROM Meeting m JOIN FETCH m.company c LEFT JOIN FETCH m.lead l "
                        + "WHERE m.meetingDate >= :start AND m.meetingDate <= :end "
                        + "AND (:companyId IS NULL OR c.id = :companyId) "
                        + "ORDER BY m.meetingDate ASC, m.meetingTime ASC")
        List<Meeting> searchAdminAgendaWithoutText(@Param("start") LocalDate start, @Param("end") LocalDate end,
                        @Param("companyId") UUID companyId);

        /** Mesmo filtro {@link #searchAdminAgendaWithoutText} com paginação (sem FETCH — lazy dentro da transação). */
        @Query("SELECT m FROM Meeting m JOIN m.company c LEFT JOIN m.lead l "
                        + "WHERE m.meetingDate >= :start AND m.meetingDate <= :end "
                        + "AND (:companyId IS NULL OR c.id = :companyId)")
        Page<Meeting> searchAdminAgendaWithoutTextPage(@Param("start") LocalDate start, @Param("end") LocalDate end,
                        @Param("companyId") UUID companyId, Pageable pageable);

        /**
         * IDs ordenados para busca textual — usa ILIKE (PostgreSQL), sem LOWER em colunas.
         */
        @Query(value = "SELECT m.id FROM winai.meetings m "
                        + "INNER JOIN winai.companies c ON c.id = m.company_id "
                        + "LEFT JOIN winai.leads l ON l.id = m.lead_id "
                        + "WHERE m.meeting_date BETWEEN :start AND :end "
                        + "AND (:companyId IS NULL OR c.id = :companyId) "
                        + "AND (m.title ILIKE '%' || :q || '%' "
                        + "OR c.name ILIKE '%' || :q || '%' "
                        + "OR m.contact_name ILIKE '%' || :q || '%' "
                        + "OR (l.name IS NOT NULL AND l.name ILIKE '%' || :q || '%')) "
                        + "ORDER BY m.meeting_date ASC, m.meeting_time ASC", nativeQuery = true)
        List<UUID> searchAdminAgendaIdsWithText(@Param("start") LocalDate start,
                        @Param("end") LocalDate end, @Param("companyId") UUID companyId, @Param("q") String q);

        @Query(value = "SELECT m.id FROM winai.meetings m "
                        + "INNER JOIN winai.companies c ON c.id = m.company_id "
                        + "LEFT JOIN winai.leads l ON l.id = m.lead_id "
                        + "WHERE m.meeting_date BETWEEN :start AND :end "
                        + "AND (:companyId IS NULL OR c.id = :companyId) "
                        + "AND (m.title ILIKE '%' || :q || '%' "
                        + "OR c.name ILIKE '%' || :q || '%' "
                        + "OR m.contact_name ILIKE '%' || :q || '%' "
                        + "OR (l.name IS NOT NULL AND l.name ILIKE '%' || :q || '%')) "
                        + "ORDER BY m.meeting_date ASC, m.meeting_time ASC",
                        countQuery = "SELECT count(m.id) FROM winai.meetings m "
                        + "INNER JOIN winai.companies c ON c.id = m.company_id "
                        + "LEFT JOIN winai.leads l ON l.id = m.lead_id "
                        + "WHERE m.meeting_date BETWEEN :start AND :end "
                        + "AND (:companyId IS NULL OR c.id = :companyId) "
                        + "AND (m.title ILIKE '%' || :q || '%' "
                        + "OR c.name ILIKE '%' || :q || '%' "
                        + "OR m.contact_name ILIKE '%' || :q || '%' "
                        + "OR (l.name IS NOT NULL AND l.name ILIKE '%' || :q || '%'))",
                        nativeQuery = true)
        Page<UUID> searchAdminAgendaIdsWithTextPage(@Param("start") LocalDate start,
                        @Param("end") LocalDate end, @Param("companyId") UUID companyId, @Param("q") String q,
                        Pageable pageable);

        @Query("SELECT m FROM Meeting m JOIN FETCH m.company c LEFT JOIN FETCH m.lead l WHERE m.id IN :ids")
        List<Meeting> findByIdsWithFetch(@Param("ids") List<UUID> ids);

        @Query("SELECT COUNT(m) FROM Meeting m JOIN m.lead l WHERE l.ownerUser.id = :userId "
                        + "AND m.meetingDate BETWEEN :start AND :end")
        long countMeetingsForLeadOwnerBetween(@Param("userId") UUID userId, @Param("start") LocalDate start,
                        @Param("end") LocalDate end);

        /** Agenda admin — encontros cujo lead tem responsável = colaborador (próximas semanas). */
        @Query("SELECT m FROM Meeting m JOIN FETCH m.company c LEFT JOIN FETCH m.lead l WHERE l.ownerUser.id = :userId "
                        + "AND m.meetingDate >= :start AND m.meetingDate <= :end ORDER BY m.meetingDate ASC, m.meetingTime ASC")
        List<Meeting> findForLeadOwnerDateRange(@Param("userId") UUID userId, @Param("start") LocalDate start,
                        @Param("end") LocalDate end);
}
