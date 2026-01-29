package com.backend.winai.repository;

import com.backend.winai.entity.FollowUpConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FollowUpConfigRepository extends JpaRepository<FollowUpConfig, UUID> {

    /**
     * Busca configuração de follow-up por empresa.
     */
    Optional<FollowUpConfig> findByCompanyId(UUID companyId);

    /**
     * Lista todas as configurações ativas (enabled = true).
     */
    List<FollowUpConfig> findByEnabledTrue();
}
