package com.backend.winai.repository;

import com.backend.winai.entity.SystemPrompt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SystemPromptRepository extends JpaRepository<SystemPrompt, UUID> {

    List<SystemPrompt> findAllByOrderByCategoryAscNameAsc();

    Optional<SystemPrompt> findByCategory(String category);

    Optional<SystemPrompt> findByCategoryAndIsActiveTrue(String category);

    Optional<SystemPrompt> findByCategoryAndIsDefaultTrue(String category);

    Optional<SystemPrompt> findByCategoryAndIsActiveTrueAndIsDefaultTrue(String category);
}
