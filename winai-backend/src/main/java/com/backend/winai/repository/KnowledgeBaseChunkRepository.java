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

    // `extensions.vector`: pgvector mora no schema `extensions` no Supabase; sem qualificar,
    // o search_path da sessão (currentSchema=winai) não acha o tipo e o cast falha.
    @Modifying
    @Query(value = "UPDATE winai.knowledge_base_chunks SET embedding = cast(:embedding as extensions.vector) WHERE id = :id", nativeQuery = true)
    void updateEmbedding(@Param("id") UUID id, @Param("embedding") String embedding);
}
