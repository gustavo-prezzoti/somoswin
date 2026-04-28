package com.backend.winai.repository;

import com.backend.winai.entity.GoalStatus;
import com.backend.winai.entity.GoalTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface GoalTaskRepository extends JpaRepository<GoalTask, Long> {

    List<GoalTask> findByGoal_IdOrderBySortOrderAscIdAsc(Long goalId);

    List<GoalTask> findByGoal_IdIn(Collection<Long> goalIds);

    /**
     * Tarefas de meta pendentes com prazo definido até {@code until} (inclui atrasadas e próximas).
     * Usado nos alertas prioritários do dashboard admin — não usa {@link com.backend.winai.entity.Notification}.
     */
    @Query("SELECT gt FROM GoalTask gt JOIN FETCH gt.goal g JOIN FETCH g.company c "
            + "WHERE g.status = :goalStatus AND gt.completed = false AND gt.deadline IS NOT NULL "
            + "AND gt.deadline <= :until ORDER BY gt.deadline ASC")
    List<GoalTask> findPendingWithDeadlineUntil(@Param("goalStatus") GoalStatus goalStatus, @Param("until") LocalDate until);

    @Query("SELECT gt FROM GoalTask gt JOIN FETCH gt.goal g JOIN FETCH g.company c "
            + "WHERE g.status = :goalStatus AND gt.completed = false AND gt.deadline IS NOT NULL "
            + "AND gt.deadline <= :until AND c.id IN :companyIds ORDER BY gt.deadline ASC")
    List<GoalTask> findPendingWithDeadlineUntilForCompanies(
            @Param("goalStatus") GoalStatus goalStatus,
            @Param("until") LocalDate until,
            @Param("companyIds") Collection<UUID> companyIds);

    @Query("SELECT COUNT(gt) FROM GoalTask gt JOIN gt.goal g JOIN CompanyStrategicDiagnosis d ON d.company = g.company "
            + "WHERE gt.completed = true AND d.publishedAt IS NOT NULL AND d.updatedByUserId = :uid")
    long countCompletedInPlaybookCompaniesByPublisher(@Param("uid") UUID uid);

    @Query("SELECT COUNT(gt) FROM GoalTask gt JOIN gt.goal g JOIN CompanyStrategicDiagnosis d ON d.company = g.company "
            + "WHERE d.publishedAt IS NOT NULL AND d.updatedByUserId = :uid")
    long countAllTasksInPlaybookCompaniesByPublisher(@Param("uid") UUID uid);
}
