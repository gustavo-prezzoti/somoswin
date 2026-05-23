package com.backend.winai.repository;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.WhatsAppConversation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WhatsAppConversationRepository extends JpaRepository<WhatsAppConversation, UUID> {

        @Modifying(flushAutomatically = true, clearAutomatically = true)
        @Query("UPDATE WhatsAppConversation c SET c.lead = null WHERE c.lead.id = :leadId")
        void clearLeadReference(@Param("leadId") UUID leadId);

        Optional<WhatsAppConversation> findByPhoneNumberAndCompany(String phoneNumber, Company company);

        Optional<WhatsAppConversation> findByWaChatIdAndCompany(String waChatId, Company company);

        // Busca por telefone + empresa + instância (cada instância tem suas próprias
        // conversas)
        Optional<WhatsAppConversation> findByPhoneNumberAndCompanyAndUazapInstance(
                        String phoneNumber, Company company, String uazapInstance);

        // Busca por chatId + empresa + instância
        Optional<WhatsAppConversation> findByWaChatIdAndCompanyAndUazapInstance(
                        String waChatId, Company company, String uazapInstance);

        Optional<WhatsAppConversation> findFirstByUazapInstance(String uazapInstance);

        List<WhatsAppConversation> findByCompany(Company company);

        List<WhatsAppConversation> findByCompanyOrderByLastMessageTimestampDesc(Company company);

        @Query("SELECT c FROM WhatsAppConversation c LEFT JOIN FETCH c.lead WHERE c.company = :company ORDER BY COALESCE(c.lastMessageTimestamp, 0) DESC")
        List<WhatsAppConversation> findByCompanyOrderByLastMessageTimestampDescWithLead(@Param("company") Company company);

        Page<WhatsAppConversation> findByCompanyOrderByLastMessageTimestampDesc(Company company, Pageable pageable);

        List<WhatsAppConversation> findByCompanyAndIsArchivedOrderByLastMessageTimestampDesc(Company company,
                        Boolean isArchived);

        @Query("SELECT COUNT(c) FROM WhatsAppConversation c WHERE c.company = :company AND c.unreadCount > 0")
        Long countUnreadByCompany(@Param("company") Company company);

        @Query("SELECT c FROM WhatsAppConversation c LEFT JOIN FETCH c.company LEFT JOIN FETCH c.lead WHERE c.id = :id")
        Optional<WhatsAppConversation> findByIdWithCompany(@Param("id") UUID id);

        List<WhatsAppConversation> findByLead_Id(UUID leadId);

        @Query(value = "SELECT c FROM WhatsAppConversation c ORDER BY COALESCE(c.lastMessageTimestamp, 0) DESC",
                        countQuery = "SELECT count(c) FROM WhatsAppConversation c")
        Page<WhatsAppConversation> findAllOrderByLastMessageDesc(Pageable pageable);

        @Query("SELECT c FROM WhatsAppConversation c LEFT JOIN FETCH c.lead LEFT JOIN FETCH c.company "
                + "WHERE LOWER(c.supportMode) = 'ia' "
                + "AND c.lastMessageTimestamp IS NOT NULL "
                + "AND c.lastMessageTimestamp < :cutoffMs")
        List<WhatsAppConversation> findIaConversationsIdleSince(@Param("cutoffMs") long cutoffMs);
}
