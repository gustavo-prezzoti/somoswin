package com.backend.winai.repository;

import com.backend.winai.entity.CompanyAgentDocument;
import com.backend.winai.entity.KnowledgeBase;
import com.backend.winai.entity.KnowledgeBaseAgentDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface KnowledgeBaseAgentDocumentRepository extends JpaRepository<KnowledgeBaseAgentDocument, UUID> {

    @Query("SELECT l.document FROM KnowledgeBaseAgentDocument l WHERE l.knowledgeBase.id = :kbId ORDER BY l.document.createdAt ASC")
    List<CompanyAgentDocument> findDocumentsByKnowledgeBaseId(@Param("kbId") UUID kbId);

    @Query("SELECT CASE WHEN COUNT(l) > 0 THEN true ELSE false END FROM KnowledgeBaseAgentDocument l "
            + "WHERE l.knowledgeBase.id = :kbId AND l.document.id = :docId")
    boolean existsByKnowledgeBaseIdAndDocumentId(@Param("kbId") UUID kbId, @Param("docId") UUID docId);

    void deleteByKnowledgeBase(KnowledgeBase knowledgeBase);
}
