package com.backend.winai.repository;

import com.backend.winai.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CompanyRepository extends JpaRepository<Company, UUID> {

    @Query("SELECT c FROM Company c LEFT JOIN FETCH c.planEntity WHERE c.id = :id")
    Optional<Company> findByIdWithPlan(@Param("id") UUID id);

    Optional<Company> findByAsaasSubscriptionId(String asaasSubscriptionId);

    Optional<Company> findByAsaasCustomerId(String asaasCustomerId);

    Optional<Company> findByPendingPlanPaymentId(String pendingPlanPaymentId);

    @Query("SELECT COUNT(c) FROM Company c WHERE c.createdAt >= :since")
    long countByCreatedAtAfter(@Param("since") ZonedDateTime since);
}
