package com.backend.winai.repository;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.MetaCampaign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

@Repository
public interface MetaCampaignRepository extends JpaRepository<MetaCampaign, UUID> {
    Optional<MetaCampaign> findByMetaId(String metaId);

    List<MetaCampaign> findByCompanyId(UUID companyId);

    void deleteByCompany(Company company);
}
