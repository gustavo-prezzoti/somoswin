package com.backend.winai.repository;

import com.backend.winai.entity.GoogleAdsConnection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface GoogleAdsConnectionRepository extends JpaRepository<GoogleAdsConnection, UUID> {
    Optional<GoogleAdsConnection> findByCompany_Id(UUID companyId);
}
