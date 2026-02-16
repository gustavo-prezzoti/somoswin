package com.backend.winai.repository;

import com.backend.winai.entity.AiRecommendationCache;
import com.backend.winai.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AiRecommendationCacheRepository extends JpaRepository<AiRecommendationCache, UUID> {

    Optional<AiRecommendationCache> findByCompany(Company company);

    Optional<AiRecommendationCache> findByCompanyId(UUID companyId);
}
