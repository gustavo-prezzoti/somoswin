package com.backend.winai.repository;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.GlobalNotificationConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface GlobalNotificationConfigRepository extends JpaRepository<GlobalNotificationConfig, UUID> {
    Optional<GlobalNotificationConfig> findByCompany(Company company);

    Optional<GlobalNotificationConfig> findByCompanyId(UUID companyId);
}
