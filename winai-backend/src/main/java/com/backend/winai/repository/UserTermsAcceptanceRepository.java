package com.backend.winai.repository;

import com.backend.winai.entity.UserTermsAcceptance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserTermsAcceptanceRepository extends JpaRepository<UserTermsAcceptance, UUID> {

    Optional<UserTermsAcceptance> findByUserIdAndTermsOfServiceId(UUID userId, UUID termsOfServiceId);

    List<UserTermsAcceptance> findByUserId(UUID userId);

    List<UserTermsAcceptance> findByTermsOfServiceId(UUID termsOfServiceId);

    @Query("SELECT uta FROM UserTermsAcceptance uta " +
            "JOIN FETCH uta.user u " +
            "JOIN FETCH uta.termsOfService t " +
            "WHERE t.active = true")
    List<UserTermsAcceptance> findAllAcceptancesForActiveTerms();

    @Query("SELECT CASE WHEN COUNT(uta) > 0 THEN true ELSE false END " +
            "FROM UserTermsAcceptance uta " +
            "WHERE uta.user.id = :userId AND uta.termsOfService.active = true")
    boolean hasUserAcceptedActiveTerms(@Param("userId") UUID userId);
}
