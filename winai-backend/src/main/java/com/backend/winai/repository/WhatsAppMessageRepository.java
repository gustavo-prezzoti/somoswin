package com.backend.winai.repository;

import com.backend.winai.entity.WhatsAppConversation;
import com.backend.winai.entity.WhatsAppMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WhatsAppMessageRepository extends JpaRepository<WhatsAppMessage, UUID> {

        @Modifying
        @Query("UPDATE WhatsAppMessage m SET m.lead = null WHERE m.lead.id = :leadId")
        void clearLeadReference(@Param("leadId") UUID leadId);

        Optional<WhatsAppMessage> findByMessageId(String messageId);

        List<WhatsAppMessage> findByConversationOrderByMessageTimestampAsc(WhatsAppConversation conversation);

        @Query("SELECT m FROM WhatsAppMessage m WHERE m.conversation = :conversation ORDER BY m.messageTimestamp DESC")
        List<WhatsAppMessage> findLatestByConversation(@Param("conversation") WhatsAppConversation conversation,
                        org.springframework.data.domain.Pageable pageable);

        @Query("SELECT COUNT(m) FROM WhatsAppMessage m WHERE m.conversation.company = :company AND m.messageTimestamp >= :startOfDay")
        Long countMessagesTodayByCompany(@Param("company") com.backend.winai.entity.Company company,
                        @Param("startOfDay") Long startOfDay);

        @Query("SELECT MAX(m.messageTimestamp) FROM WhatsAppMessage m WHERE m.conversation.company = :company")
        Long findLastMessageTimestampByCompany(@Param("company") com.backend.winai.entity.Company company);

        @Query("SELECT COUNT(m) FROM WhatsAppMessage m WHERE m.conversation.company = :company AND m.fromMe = :fromMe AND m.messageTimestamp >= :startOfDay")
        Long countMessagesTodayByCompanyAndFromMe(@Param("company") com.backend.winai.entity.Company company,
                        @Param("fromMe") boolean fromMe,
                        @Param("startOfDay") Long startOfDay);

        // Novos métodos para histórico de chat
        List<WhatsAppMessage> findByConversationOrderByMessageTimestampDesc(WhatsAppConversation conversation);

        @Query("SELECT m FROM WhatsAppMessage m WHERE m.conversation = :conversation AND m.messageType = :messageType ORDER BY m.messageTimestamp DESC")
        List<WhatsAppMessage> findByConversationAndMessageType(@Param("conversation") WhatsAppConversation conversation,
                        @Param("messageType") String messageType);

        @Query("SELECT m FROM WhatsAppMessage m WHERE m.lead.id = :leadId ORDER BY m.messageTimestamp DESC")
        List<WhatsAppMessage> findByLeadId(@Param("leadId") UUID leadId);

        @Query("SELECT m FROM WhatsAppMessage m WHERE m.conversation.company.id = :companyId ORDER BY m.messageTimestamp DESC")
        List<WhatsAppMessage> findByCompanyId(@Param("companyId") UUID companyId,
                        org.springframework.data.domain.Pageable pageable);

        /**
         * Busca mensagens por ID da conversa ordenadas por timestamp decrescente
         */
        @Query("SELECT m FROM WhatsAppMessage m WHERE m.conversation.id = :conversationId ORDER BY m.messageTimestamp DESC")
        List<WhatsAppMessage> findByConversationIdOrderByMessageTimestampDesc(
                        @Param("conversationId") UUID conversationId);

        void deleteByConversation(WhatsAppConversation conversation);
}
