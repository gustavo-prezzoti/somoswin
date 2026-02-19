package com.backend.winai.repository;

import com.backend.winai.entity.KnowledgeBase;
import com.backend.winai.entity.KnowledgeBaseConnection;
import com.backend.winai.entity.UserWhatsAppConnection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface KnowledgeBaseConnectionRepository extends JpaRepository<KnowledgeBaseConnection, UUID> {
    List<KnowledgeBaseConnection> findByKnowledgeBase(KnowledgeBase knowledgeBase);

    Optional<KnowledgeBaseConnection> findByConnection(UserWhatsAppConnection connection);

    @Query("SELECT kbc FROM KnowledgeBaseConnection kbc LEFT JOIN FETCH kbc.knowledgeBase WHERE kbc.connection.id = :connectionId")
    Optional<KnowledgeBaseConnection> findByConnectionIdWithKnowledgeBase(@Param("connectionId") UUID connectionId);

    void deleteByConnection(UserWhatsAppConnection connection);
}
