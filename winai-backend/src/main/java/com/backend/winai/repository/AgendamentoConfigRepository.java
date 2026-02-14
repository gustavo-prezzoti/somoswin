package com.backend.winai.repository;

import com.backend.winai.entity.AgendamentoConfig;
import com.backend.winai.entity.Company;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AgendamentoConfigRepository extends JpaRepository<AgendamentoConfig, UUID> {

    Optional<AgendamentoConfig> findByCompanyId(UUID companyId);

    Optional<AgendamentoConfig> findByCompany(Company company);
}
