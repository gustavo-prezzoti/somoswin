package com.backend.winai.repository;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.MetaAd;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

@Repository
public interface MetaAdRepository extends JpaRepository<MetaAd, UUID> {
    Optional<MetaAd> findByMetaId(String metaId);

    List<MetaAd> findByCompanyId(UUID companyId);

    void deleteByCompany(Company company);
}
