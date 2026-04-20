package com.backend.winai.repository;

import com.backend.winai.entity.User;
import com.backend.winai.entity.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    @Query(
            value = "SELECT u FROM User u LEFT JOIN u.company c WHERE "
                    + "(LOWER(u.name) LIKE LOWER(CONCAT('%', :q, '%')) OR "
                    + "LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%')) OR "
                    + "(c IS NOT NULL AND LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%'))))",
            countQuery = "SELECT COUNT(u) FROM User u LEFT JOIN u.company c WHERE "
                    + "(LOWER(u.name) LIKE LOWER(CONCAT('%', :q, '%')) OR "
                    + "LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%')) OR "
                    + "(c IS NOT NULL AND LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%'))))")
    Page<User> findAdminUsersPage(@Param("q") String q, Pageable pageable);

    @Query("SELECT u FROM User u WHERE u.company.id = :companyId")
    List<User> findByCompanyId(UUID companyId);

    long countByCompany_Id(UUID companyId);

    long countByCompany_IdAndRoleAndIsActiveTrue(UUID companyId, UserRole role);

    /** Primeiro usuário da empresa (responsável financeiro / dono da conta). */
    Optional<User> findFirstByCompany_IdOrderByCreatedAtAscIdAsc(UUID companyId);
}
