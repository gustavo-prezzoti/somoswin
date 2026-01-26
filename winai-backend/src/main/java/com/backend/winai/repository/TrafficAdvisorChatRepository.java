package com.backend.winai.repository;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.TrafficAdvisorChat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TrafficAdvisorChatRepository extends JpaRepository<TrafficAdvisorChat, UUID> {

    List<TrafficAdvisorChat> findByCompanyOrderByCreatedAtDesc(Company company);

    Optional<TrafficAdvisorChat> findByIdAndCompany(UUID id, Company company);
}
