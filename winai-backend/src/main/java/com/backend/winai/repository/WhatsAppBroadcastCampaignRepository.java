package com.backend.winai.repository;

import com.backend.winai.entity.WhatsAppBroadcastCampaign;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface WhatsAppBroadcastCampaignRepository extends JpaRepository<WhatsAppBroadcastCampaign, UUID> {

    Page<WhatsAppBroadcastCampaign> findByCompany_IdOrderByCreatedAtDesc(UUID companyId, Pageable pageable);

    @Query("SELECT c FROM WhatsAppBroadcastCampaign c WHERE c.id = :id AND c.company.id = :companyId")
    Optional<WhatsAppBroadcastCampaign> findByIdAndCompany_Id(@Param("id") UUID id, @Param("companyId") UUID companyId);
}
