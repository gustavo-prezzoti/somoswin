package com.backend.winai.repository;

import com.backend.winai.entity.WhatsAppAttributionToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface WhatsAppAttributionTokenRepository extends JpaRepository<WhatsAppAttributionToken, UUID> {

    @Query("SELECT t FROM WhatsAppAttributionToken t JOIN FETCH t.company WHERE t.token = :token")
    Optional<WhatsAppAttributionToken> findByTokenFetchCompany(@Param("token") String token);

    void deleteByCompany_Id(UUID companyId);
}
