package com.backend.winai.repository;

import com.backend.winai.entity.InstagramMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.UUID;
import java.util.List;
import java.util.Optional;

@Repository
public interface InstagramMetricRepository extends JpaRepository<InstagramMetric, UUID> {
    List<InstagramMetric> findByCompanyIdAndDateBetween(UUID companyId, LocalDate startDate, LocalDate endDate);

    Optional<InstagramMetric> findByCompanyIdAndDate(UUID companyId, LocalDate date);
}
