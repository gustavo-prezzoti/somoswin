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

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.company LEFT JOIN FETCH u.ampliaStaffRole WHERE u.email = :email")
    Optional<User> findByEmailWithCompany(String email);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.company LEFT JOIN FETCH u.ampliaStaffRole WHERE u.id = :id")
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

    List<User> findByAmpliaInternalStaffTrueOrderByNameAsc();

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.ampliaStaffRole WHERE u.ampliaInternalStaff = true ORDER BY u.name ASC")
    List<User> findByAmpliaInternalStaffTrueWithRoleOrderByNameAsc();

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.ampliaStaffRole WHERE u.id = :id")
    Optional<User> findByIdWithAmpliaStaffRole(@Param("id") UUID id);

    /** Colaboradores internos vinculados a este papel (para impedir exclusão). */
    long countByAmpliaStaffRole_Id(UUID ampliaStaffRoleId);

    @Query("SELECT u.company.id, MAX(u.lastLogin) FROM User u WHERE u.company IS NOT NULL GROUP BY u.company.id")
    List<Object[]> findMaxLastLoginByCompany();

    /** Primeiro usuário por empresa (menor createdAt), para rótulo “consultor” no admin. */
    @Query("SELECT u FROM User u JOIN FETCH u.company c WHERE u.company IS NOT NULL ORDER BY c.id, u.createdAt ASC, u.id ASC")
    List<User> findAllCompanyUsersOrderForConsultantPick();
}
