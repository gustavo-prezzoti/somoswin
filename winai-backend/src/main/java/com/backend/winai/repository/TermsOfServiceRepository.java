package com.backend.winai.repository;

import com.backend.winai.entity.TermsOfService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TermsOfServiceRepository extends JpaRepository<TermsOfService, UUID> {

    Optional<TermsOfService> findByActiveTrue();

    Optional<TermsOfService> findTopByOrderByCreatedAtDesc();

    Optional<TermsOfService> findByVersion(String version);
}
