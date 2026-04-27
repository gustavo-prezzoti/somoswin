package com.backend.winai.repository;

import com.backend.winai.entity.CompanyPaidTrafficTarget;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompanyPaidTrafficTargetRepository extends JpaRepository<CompanyPaidTrafficTarget, UUID> {
    Optional<CompanyPaidTrafficTarget> findByCompany_IdAndYearMonth(UUID companyId, String yearMonth);

    List<CompanyPaidTrafficTarget> findAllByCompany_Id(UUID companyId);
}
