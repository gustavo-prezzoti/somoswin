package com.backend.winai.repository;

import com.backend.winai.entity.WhatsAppBroadcastCampaign;
import com.backend.winai.entity.WhatsAppBroadcastDispatch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WhatsAppBroadcastDispatchRepository extends JpaRepository<WhatsAppBroadcastDispatch, UUID> {

    @Query("SELECT d FROM WhatsAppBroadcastDispatch d "
            + "JOIN FETCH d.recipient r JOIN FETCH r.campaign c JOIN FETCH c.connection "
            + "LEFT JOIN FETCH c.createdBy LEFT JOIN FETCH r.lead "
            + "WHERE d.id = :id")
    Optional<WhatsAppBroadcastDispatch> findByIdForDelivery(@Param("id") UUID id);

    @Query("SELECT d FROM WhatsAppBroadcastDispatch d JOIN FETCH d.recipient r JOIN FETCH r.campaign c "
            + "WHERE c.id = :campaignId ORDER BY r.createdAt ASC, d.sequenceIndex ASC")
    List<WhatsAppBroadcastDispatch> findAllFetchedByCampaignId(@Param("campaignId") UUID campaignId);

    @Query("SELECT d FROM WhatsAppBroadcastDispatch d WHERE d.recipient.campaign.id = :campaignId "
            + "ORDER BY d.recipient.createdAt ASC, d.sequenceIndex ASC")
    Page<WhatsAppBroadcastDispatch> pageByCampaignId(@Param("campaignId") UUID campaignId, Pageable pageable);

    long countByRecipient_Campaign_IdAndStatus(UUID campaignId, WhatsAppBroadcastDispatch.Status status);

    long countByRecipient_IdAndStatus(UUID recipientId, WhatsAppBroadcastDispatch.Status status);

    long countByRecipient_Id(UUID recipientId);

    long countByRecipient_Campaign_Id(UUID campaignId);

    List<WhatsAppBroadcastDispatch> findByRecipient_Campaign_IdAndStatus(
            UUID campaignId, WhatsAppBroadcastDispatch.Status status);

    @Query("SELECT COUNT(d) FROM WhatsAppBroadcastDispatch d WHERE d.recipient.campaign.company.id = :companyId "
            + "AND d.status = :status AND COALESCE(d.sentAt, d.createdAt) >= :since")
    long countByCompanyAndStatusSince(@Param("companyId") UUID companyId,
            @Param("status") WhatsAppBroadcastDispatch.Status status,
            @Param("since") ZonedDateTime since);

    @Query("SELECT d.id FROM WhatsAppBroadcastDispatch d JOIN d.recipient r JOIN r.campaign c "
            + "WHERE d.status = :dStatus AND c.status = :cStatus "
            + "AND d.scheduledSendAt IS NOT NULL AND d.scheduledSendAt <= :now "
            + "ORDER BY d.scheduledSendAt ASC")
    List<UUID> findDueIdsForSending(
            @Param("dStatus") WhatsAppBroadcastDispatch.Status dStatus,
            @Param("cStatus") WhatsAppBroadcastCampaign.Status cStatus,
            @Param("now") ZonedDateTime now,
            Pageable pageable);

    void deleteByRecipient_Id(UUID recipientId);
}
