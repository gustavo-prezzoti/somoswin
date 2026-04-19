package com.backend.winai.repository;

import com.backend.winai.entity.User;
import com.backend.winai.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    Optional<User> findByEmailVerificationToken(String token);

    Optional<User> findByPasswordResetToken(String token);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.company WHERE u.email = :email")
    Optional<User> findByEmailWithCompany(String email);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.company WHERE u.id = :id")
    Optional<User> findByIdWithCompany(UUID id);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.company")
    List<User> findAllWithCompany();

    @Query("SELECT u FROM User u WHERE u.company.id = :companyId")
    List<User> findByCompanyId(UUID companyId);

    long countByCompany_Id(UUID companyId);

    long countByCompany_IdAndRoleAndIsActiveTrue(UUID companyId, UserRole role);

    /** Primeiro usuário da empresa (responsável financeiro / dono da conta). */
    Optional<User> findFirstByCompany_IdOrderByCreatedAtAscIdAsc(UUID companyId);
}
