package com.backend.winai.repository;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.MetaInsight;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.UUID;
import java.util.List;
import java.util.Optional;

@Repository
public interface MetaInsightRepository extends JpaRepository<MetaInsight, UUID> {
    List<MetaInsight> findByCompanyIdAndDateBetween(UUID companyId, LocalDate startDate, LocalDate endDate);

    Optional<MetaInsight> findByCompanyIdAndDateAndLevelAndExternalId(UUID companyId, LocalDate date, String level,
            String externalId);

    void deleteByCompany(Company company);
}
