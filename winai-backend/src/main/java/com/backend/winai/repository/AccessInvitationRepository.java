package com.backend.winai.repository;

import com.backend.winai.entity.AccessInvitation;
import com.backend.winai.entity.InvitationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccessInvitationRepository extends JpaRepository<AccessInvitation, UUID> {

    Optional<AccessInvitation> findByToken(String token);

    List<AccessInvitation> findByCompany_IdAndStatusOrderByCreatedAtDesc(UUID companyId, InvitationStatus status);

    long countByCompany_IdAndStatus(UUID companyId, InvitationStatus status);
}
