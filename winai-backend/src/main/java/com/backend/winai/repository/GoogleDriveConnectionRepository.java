package com.backend.winai.repository;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.GoogleDriveConnection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface GoogleDriveConnectionRepository extends JpaRepository<GoogleDriveConnection, UUID> {

    Optional<GoogleDriveConnection> findByCompany(Company company);

    Optional<GoogleDriveConnection> findByCompanyId(UUID companyId);

    void deleteByCompany(Company company);
}
