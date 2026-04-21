package com.backend.winai.repository;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.LeadAttributionAnchor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LeadAttributionAnchorRepository extends JpaRepository<LeadAttributionAnchor, UUID> {

    List<LeadAttributionAnchor> findByCompanyOrderByCreatedAtDesc(Company company);

    @Modifying
    @Query(value = "UPDATE winai.lead_attribution_anchors SET embedding = cast(:embedding as vector) WHERE id = :id", nativeQuery = true)
    void updateEmbedding(@Param("id") UUID id, @Param("embedding") String embedding);

    @Query(value = """
            SELECT cast(id as varchar), (1 - (embedding <=> cast(:emb as vector))) as sim
            FROM winai.lead_attribution_anchors
            WHERE company_id = :companyId AND active = true AND embedding IS NOT NULL
            ORDER BY embedding <=> cast(:emb as vector)
            LIMIT :lim
            """, nativeQuery = true)
    List<Object[]> findTopByCosineSimilarity(
            @Param("companyId") UUID companyId,
            @Param("emb") String emb,
            @Param("lim") int lim);
}
