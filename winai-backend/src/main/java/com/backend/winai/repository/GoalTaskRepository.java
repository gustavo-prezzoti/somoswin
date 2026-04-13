package com.backend.winai.repository;

import com.backend.winai.entity.GoalTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface GoalTaskRepository extends JpaRepository<GoalTask, Long> {

    List<GoalTask> findByGoal_IdOrderBySortOrderAscIdAsc(Long goalId);

    List<GoalTask> findByGoal_IdIn(Collection<Long> goalIds);
}
