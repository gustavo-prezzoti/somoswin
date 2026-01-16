package com.backend.winai.repository;

import com.backend.winai.entity.MetaAdSet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

@Repository
public interface MetaAdSetRepository extends JpaRepository<MetaAdSet, UUID> {
    Optional<MetaAdSet> findByMetaId(String metaId);

    List<MetaAdSet> findByCompanyId(UUID companyId);
}
