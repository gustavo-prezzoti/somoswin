package com.backend.winai.repository;

import com.backend.winai.entity.CrmLeadTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CrmLeadTagRepository extends JpaRepository<CrmLeadTag, UUID> {

    List<CrmLeadTag> findByCompany_IdOrderByNameAsc(UUID companyId);

    @Query("SELECT t FROM CrmLeadTag t WHERE t.company.id = :companyId AND LOWER(TRIM(t.name)) = LOWER(TRIM(:name))")
    Optional<CrmLeadTag> findByCompanyIdAndNameNormalized(
            @Param("companyId") UUID companyId,
            @Param("name") String name);
}
