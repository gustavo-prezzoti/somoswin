package com.backend.winai.repository;

import com.backend.winai.entity.SupportConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SupportConfigRepository extends JpaRepository<SupportConfig, Long> {
    Optional<SupportConfig> findFirstByOrderByIdDesc();
}
