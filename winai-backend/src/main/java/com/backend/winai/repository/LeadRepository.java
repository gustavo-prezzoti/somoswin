package com.backend.winai.repository;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.Lead;
import com.backend.winai.entity.LeadStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LeadRepository extends JpaRepository<Lead, UUID> {

    long countByStatus(LeadStatus status);

    Page<Lead> findByCompanyOrderByCreatedAtDesc(Company company, Pageable pageable);

    List<Lead> findByCompanyOrderByCreatedAtDesc(Company company);

    List<Lead> findByCompanyAndStatusOrderByCreatedAtDesc(Company company, LeadStatus status);

    Optional<Lead> findByIdAndCompany(UUID id, Company company);

    Optional<Lead> findByPhoneAndCompany(String phone, Company company);

    @Query("SELECT l FROM Lead l WHERE l.company = :company AND " +
            "(LOWER(l.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(l.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "l.phone LIKE CONCAT('%', :search, '%'))")
    Page<Lead> searchByCompany(@Param("company") Company company, @Param("search") String search, Pageable pageable);

    long countByCompany(Company company);

    long countByCompany_IdAndPhoneIsNotNull(UUID companyId);

    long countByCompanyAndStatus(Company company, LeadStatus status);

    long countByCompanyAndCreatedAtBetween(Company company, java.time.LocalDateTime start, java.time.LocalDateTime end);

    @Query("SELECT l FROM Lead l WHERE l.company = :company AND l.createdAt >= :start AND l.createdAt < :end")
    List<Lead> findByCompanyAndCreatedAtRange(
            @Param("company") Company company,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    // Método removido - usando CriteriaBuilder no serviço para evitar problemas com
    // tipos null no PostgreSQL

    Page<Lead> findByStatusOrderByCreatedAtDesc(LeadStatus status, Pageable pageable);

    @Query(value = "SELECT l FROM Lead l LEFT JOIN l.company c WHERE "
            + "LOWER(l.name) LIKE LOWER(CONCAT('%', :q, '%')) OR "
            + "LOWER(l.email) LIKE LOWER(CONCAT('%', :q, '%')) OR "
            + "LOWER(COALESCE(l.phone, '')) LIKE CONCAT('%', :q, '%') OR "
            + "LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%'))",
            countQuery = "SELECT count(l) FROM Lead l LEFT JOIN l.company c WHERE "
                    + "LOWER(l.name) LIKE LOWER(CONCAT('%', :q, '%')) OR "
                    + "LOWER(l.email) LIKE LOWER(CONCAT('%', :q, '%')) OR "
                    + "LOWER(COALESCE(l.phone, '')) LIKE CONCAT('%', :q, '%') OR "
                    + "LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%'))")
    Page<Lead> searchAllLeads(@Param("q") String q, Pageable pageable);

    long countByOwnerUser_Id(UUID ownerUserId);

    long countByOwnerUser_IdAndStatus(UUID ownerUserId, LeadStatus status);

    @Query("SELECT COUNT(l) FROM Lead l WHERE l.ownerUser.id = :userId AND l.createdAt >= :start AND l.createdAt < :end")
    long countByOwnerUserAndCreatedAtRange(@Param("userId") UUID userId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);

    Page<Lead> findByOwnerUser_IdOrderByCreatedAtDesc(UUID ownerUserId, Pageable pageable);

    Page<Lead> findByOwnerUser_IdAndStatusOrderByCreatedAtDesc(UUID ownerUserId, LeadStatus status, Pageable pageable);

    /** Busca global admin restrita a leads cujo responsável é o colaborador. */
    @Query(value = "SELECT l FROM Lead l LEFT JOIN l.company c WHERE l.ownerUser.id = :ownerId AND ("
            + "LOWER(l.name) LIKE LOWER(CONCAT('%', :q, '%')) OR "
            + "LOWER(l.email) LIKE LOWER(CONCAT('%', :q, '%')) OR "
            + "LOWER(COALESCE(l.phone, '')) LIKE CONCAT('%', :q, '%') OR "
            + "LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%')))",
            countQuery = "SELECT count(l) FROM Lead l LEFT JOIN l.company c WHERE l.ownerUser.id = :ownerId AND ("
                    + "LOWER(l.name) LIKE LOWER(CONCAT('%', :q, '%')) OR "
                    + "LOWER(l.email) LIKE LOWER(CONCAT('%', :q, '%')) OR "
                    + "LOWER(COALESCE(l.phone, '')) LIKE CONCAT('%', :q, '%') OR "
                    + "LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%')))")
    Page<Lead> searchAllLeadsForOwner(@Param("ownerId") UUID ownerId, @Param("q") String q, Pageable pageable);

    @Query("SELECT DISTINCT l.company.id FROM Lead l WHERE l.ownerUser.id = :ownerId AND l.company IS NOT NULL")
    List<UUID> findDistinctCompanyIdsByOwnerUserId(@Param("ownerId") UUID ownerId);

    @Query("SELECT l.company.id, l.ownerUser.id, COUNT(l) FROM Lead l WHERE l.company IS NOT NULL AND l.ownerUser IS NOT NULL GROUP BY l.company.id, l.ownerUser.id")
    List<Object[]> countLeadsGroupedByCompanyAndOwner();

    @Query("SELECT l.company.id, COALESCE(SUM(l.estimatedValue), 0) FROM Lead l GROUP BY l.company.id")
    List<Object[]> sumEstimatedValueByCompany();
}
