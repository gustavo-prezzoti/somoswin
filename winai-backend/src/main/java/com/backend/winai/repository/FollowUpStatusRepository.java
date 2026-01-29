package com.backend.winai.repository;

import com.backend.winai.entity.FollowUpStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FollowUpStatusRepository extends JpaRepository<FollowUpStatus, UUID> {

    /**
     * Busca status de follow-up por conversa.
     */
    Optional<FollowUpStatus> findByConversationId(UUID conversationId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT fs FROM FollowUpStatus fs JOIN FETCH fs.conversation WHERE fs.id = :id")
    Optional<FollowUpStatus> findByIdWithLock(@Param("id") UUID id);

    /**
     * Busca follow-ups pendentes para processamento:
     * - nextFollowUpAt <= agora
     * - não pausado
     * - elegível
     * - conversa pertence a empresa com follow-up ativo
     */
    @Query("""
            SELECT fs FROM FollowUpStatus fs
            JOIN FETCH fs.conversation c
            JOIN FollowUpConfig fc ON fc.company = c.company
            WHERE fs.nextFollowUpAt <= :now
            AND fs.paused = false
            AND fs.eligible = true
            AND fc.enabled = true
            ORDER BY fs.nextFollowUpAt ASC
            """)
    List<FollowUpStatus> findPendingFollowUps(@Param("now") ZonedDateTime now);

    /**
     * Lista status de follow-up por empresa (para visualização admin).
     */
    @Query("""
            SELECT fs FROM FollowUpStatus fs
            JOIN FETCH fs.conversation c
            WHERE c.company.id = :companyId
            ORDER BY fs.lastMessageAt DESC
            """)
    List<FollowUpStatus> findByCompanyId(@Param("companyId") UUID companyId);

    /**
     * Conta follow-ups enviados por conversa.
     */
    @Query("SELECT fs.followUpCount FROM FollowUpStatus fs WHERE fs.conversation.id = :conversationId")
    Optional<Integer> countFollowUpsByConversation(@Param("conversationId") UUID conversationId);
}
