package com.backend.winai.repository;

import com.backend.winai.entity.CompanyStrategicDiagnosis;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompanyStrategicDiagnosisRepository extends JpaRepository<CompanyStrategicDiagnosis, UUID> {

    Optional<CompanyStrategicDiagnosis> findByCompany_Id(UUID companyId);

    long countByPublishedAtIsNotNullAndUpdatedByUserId(UUID updatedByUserId);

    @Query("SELECT DISTINCT d.company.id FROM CompanyStrategicDiagnosis d WHERE d.publishedAt IS NOT NULL AND d.updatedByUserId = :uid")
    List<UUID> findDistinctCompanyIdsPublishedBy(@Param("uid") UUID uid);

    @Query("SELECT d FROM CompanyStrategicDiagnosis d JOIN FETCH d.company c WHERE d.publishedAt IS NOT NULL AND d.updatedByUserId = :uid ORDER BY d.publishedAt DESC")
    List<CompanyStrategicDiagnosis> findPublishedByUserOrderByPublishedAtDesc(@Param("uid") UUID uid, Pageable pageable);

    @Query("SELECT COUNT(d) FROM CompanyStrategicDiagnosis d WHERE d.publishedAt IS NOT NULL AND d.company.id IN :companyIds")
    long countPublishedByCompanyIdIn(@Param("companyIds") Collection<UUID> companyIds);

    @Query("SELECT COUNT(DISTINCT d.company.id) FROM CompanyStrategicDiagnosis d WHERE d.publishedAt IS NOT NULL AND d.company.id IN :companyIds")
    long countDistinctCompaniesWithPublishedPlaybookIn(@Param("companyIds") Collection<UUID> companyIds);

    @Query("SELECT d FROM CompanyStrategicDiagnosis d JOIN FETCH d.company c WHERE d.publishedAt IS NOT NULL AND d.company.id IN :companyIds ORDER BY d.publishedAt DESC")
    List<CompanyStrategicDiagnosis> findPublishedByCompanyIdInOrderByPublishedAtDesc(
            @Param("companyIds") Collection<UUID> companyIds,
            Pageable pageable);
}
