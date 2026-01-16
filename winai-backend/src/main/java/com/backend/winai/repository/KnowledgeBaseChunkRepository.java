package com.backend.winai.repository;

import com.backend.winai.entity.KnowledgeBase;
import com.backend.winai.entity.KnowledgeBaseChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface KnowledgeBaseChunkRepository extends JpaRepository<KnowledgeBaseChunk, UUID> {
    void deleteByKnowledgeBase(KnowledgeBase knowledgeBase);

    @Modifying
    @Query(value = "UPDATE winai.knowledge_base_chunks SET embedding = cast(:embedding as vector) WHERE id = :id", nativeQuery = true)
    void updateEmbedding(@Param("id") UUID id, @Param("embedding") String embedding);
}
