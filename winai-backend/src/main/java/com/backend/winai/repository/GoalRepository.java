package com.backend.winai.repository;

import com.backend.winai.entity.Company;
import com.backend.winai.entity.Goal;
import com.backend.winai.entity.GoalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GoalRepository extends JpaRepository<Goal, Long> {

    List<Goal> findByCompanyAndStatusOrderByCreatedAtDesc(Company company, GoalStatus status);

    List<Goal> findByCompanyAndYearCycleAndStatusOrderByCreatedAtDesc(Company company, Integer yearCycle,
            GoalStatus status);

    List<Goal> findByCompanyOrderByCreatedAtDesc(Company company);
}
