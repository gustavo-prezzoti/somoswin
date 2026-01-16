package com.backend.winai.repository;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.Meeting;
import com.backend.winai.entity.MeetingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MeetingRepository extends JpaRepository<Meeting, UUID> {

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
}
