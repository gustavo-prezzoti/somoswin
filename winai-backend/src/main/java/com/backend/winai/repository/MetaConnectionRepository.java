package com.backend.winai.repository;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.MetaConnection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface MetaConnectionRepository extends JpaRepository<MetaConnection, UUID> {
    Optional<MetaConnection> findByCompany(Company company);

    Optional<MetaConnection> findByCompanyId(UUID companyId);
}
