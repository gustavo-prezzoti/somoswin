package com.backend.winai.repository;

import com.backend.winai.entity.WhatsAppBroadcastCampaign;
import com.backend.winai.entity.WhatsAppBroadcastRecipient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WhatsAppBroadcastRecipientRepository extends JpaRepository<WhatsAppBroadcastRecipient, UUID> {

    @Query("SELECT r FROM WhatsAppBroadcastRecipient r JOIN FETCH r.campaign c JOIN FETCH c.company comp "
            + "LEFT JOIN FETCH c.createdBy LEFT JOIN FETCH c.connection LEFT JOIN FETCH r.lead "
            + "WHERE r.id = :id")
    Optional<WhatsAppBroadcastRecipient> findByIdForDelivery(@Param("id") UUID id);

    List<WhatsAppBroadcastRecipient> findByCampaign_IdOrderByCreatedAtAsc(UUID campaignId);

    Page<WhatsAppBroadcastRecipient> findByCampaign_IdOrderByCreatedAtAsc(UUID campaignId, Pageable pageable);

    long countByCampaign_Id(UUID campaignId);

    long countByCampaign_IdAndStatus(UUID campaignId, WhatsAppBroadcastRecipient.Status status);

    @Query("SELECT COUNT(r) FROM WhatsAppBroadcastRecipient r WHERE r.campaign.company.id = :companyId "
            + "AND r.status = :status AND COALESCE(r.sentAt, r.createdAt) >= :since")
    long countByCompanyAndStatusSince(@Param("companyId") UUID companyId,
            @Param("status") WhatsAppBroadcastRecipient.Status status,
            @Param("since") ZonedDateTime since);

    List<WhatsAppBroadcastRecipient> findTop20ByStatusAndCampaign_StatusOrderByCreatedAtAsc(
            WhatsAppBroadcastRecipient.Status status,
            WhatsAppBroadcastCampaign.Status campaignStatus);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE WhatsAppBroadcastRecipient r SET r.lead = null WHERE r.lead.id = :leadId")
    void clearLeadReference(@Param("leadId") UUID leadId);
}
