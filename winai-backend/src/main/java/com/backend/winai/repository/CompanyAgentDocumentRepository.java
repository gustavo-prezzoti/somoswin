package com.backend.winai.repository;

import com.backend.winai.entity.CompanyAgentDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CompanyAgentDocumentRepository extends JpaRepository<CompanyAgentDocument, UUID> {

    List<CompanyAgentDocument> findByCompany_IdOrderByCreatedAtDesc(UUID companyId);

    Optional<CompanyAgentDocument> findByIdAndCompany_Id(UUID id, UUID companyId);
}
