package com.backend.winai.repository;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.Goal;
import com.backend.winai.entity.GoalStatus;
import com.backend.winai.entity.GoalType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface GoalRepository extends JpaRepository<Goal, Long> {

    List<Goal> findByCompanyAndStatusOrderByCreatedAtDesc(Company company, GoalStatus status);

    List<Goal> findByCompanyAndYearCycleAndStatusOrderByCreatedAtDesc(Company company, Integer yearCycle,
            GoalStatus status);

    List<Goal> findByCompanyOrderByCreatedAtDesc(Company company);

    void deleteByCompany(Company company);

    // Find active goal by company and type (for duplicate check)
    @Query("SELECT g FROM Goal g WHERE g.company = :company AND g.goalType = :goalType " +
            "AND g.status = 'ACTIVE' AND (g.endDate IS NULL OR g.endDate >= :today)")
    Optional<Goal> findActiveGoalByCompanyAndType(
            @Param("company") Company company,
            @Param("goalType") GoalType goalType,
            @Param("today") LocalDate today);

    // Find goals that should be expired (endDate passed and still ACTIVE)
    @Query("SELECT g FROM Goal g WHERE g.status = 'ACTIVE' AND g.endDate IS NOT NULL AND g.endDate < :today")
    List<Goal> findGoalsToExpire(@Param("today") LocalDate today);
}
