package com.backend.winai.repository;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.KnowledgeBase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface KnowledgeBaseRepository extends JpaRepository<KnowledgeBase, UUID> {
    List<KnowledgeBase> findByCompanyOrderByUpdatedAtDesc(Company company);

    @Query("SELECT kb FROM KnowledgeBase kb WHERE kb.company.id = :companyId ORDER BY kb.updatedAt DESC")
    List<KnowledgeBase> findByCompanyIdOrderByUpdatedAtDesc(@Param("companyId") UUID companyId);

}
