package com.backend.winai.repository;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.SocialGrowthChat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SocialGrowthChatRepository extends JpaRepository<SocialGrowthChat, UUID> {
    List<SocialGrowthChat> findByCompanyOrderByCreatedAtDesc(Company company);

    void deleteByCompany(Company company);
}
