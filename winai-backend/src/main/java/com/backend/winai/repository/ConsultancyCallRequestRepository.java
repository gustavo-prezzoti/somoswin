package com.backend.winai.repository;

import com.backend.winai.entity.ConsultancyCallRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConsultancyCallRequestRepository extends JpaRepository<ConsultancyCallRequest, UUID> {

    List<ConsultancyCallRequest> findByCompany_IdOrderByCreatedAtDesc(UUID companyId, Pageable pageable);

    @Query("SELECT r FROM ConsultancyCallRequest r JOIN FETCH r.company LEFT JOIN FETCH r.requestedBy ORDER BY r.createdAt DESC")
    List<ConsultancyCallRequest> findAllForAdmin();

    @Query("SELECT r FROM ConsultancyCallRequest r JOIN FETCH r.company c LEFT JOIN FETCH r.requestedBy WHERE r.id = :id")
    Optional<ConsultancyCallRequest> findDetailedById(@Param("id") UUID id);
}
