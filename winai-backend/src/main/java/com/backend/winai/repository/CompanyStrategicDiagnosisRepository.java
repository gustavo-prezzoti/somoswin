package com.backend.winai.repository;

import com.backend.winai.entity.CompanyStrategicDiagnosis;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CompanyStrategicDiagnosisRepository extends JpaRepository<CompanyStrategicDiagnosis, UUID> {

    Optional<CompanyStrategicDiagnosis> findByCompany_Id(UUID companyId);
}
