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

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LeadRepository extends JpaRepository<Lead, UUID> {

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

    long countByCompanyAndStatus(Company company, LeadStatus status);

    // Método removido - usando CriteriaBuilder no serviço para evitar problemas com
    // tipos null no PostgreSQL
}
