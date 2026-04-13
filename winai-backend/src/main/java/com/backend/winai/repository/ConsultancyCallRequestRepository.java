package com.backend.winai.repository;

import com.backend.winai.entity.ConsultancyCallRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ConsultancyCallRequestRepository extends JpaRepository<ConsultancyCallRequest, UUID> {
}
