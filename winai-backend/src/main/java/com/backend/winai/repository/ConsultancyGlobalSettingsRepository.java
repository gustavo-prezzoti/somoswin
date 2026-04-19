package com.backend.winai.repository;

import com.backend.winai.entity.ConsultancyGlobalSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConsultancyGlobalSettingsRepository extends JpaRepository<ConsultancyGlobalSettings, Long> {
}
