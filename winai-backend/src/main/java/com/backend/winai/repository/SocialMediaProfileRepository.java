package com.backend.winai.repository;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.SocialMediaProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SocialMediaProfileRepository extends JpaRepository<SocialMediaProfile, UUID> {
    Optional<SocialMediaProfile> findByCompany(Company company);
}
