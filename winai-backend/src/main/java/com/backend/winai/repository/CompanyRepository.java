package com.backend.winai.repository;

import com.backend.winai.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CompanyRepository extends JpaRepository<Company, UUID> {

    Optional<Company> findByAsaasSubscriptionId(String asaasSubscriptionId);

    Optional<Company> findByAsaasCustomerId(String asaasCustomerId);
}
