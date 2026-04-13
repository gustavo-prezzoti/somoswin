package com.backend.winai.repository;

import com.backend.winai.entity.GoalCheckpoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface GoalCheckpointRepository extends JpaRepository<GoalCheckpoint, Long> {

    List<GoalCheckpoint> findByGoal_IdOrderBySortOrderAscIdAsc(Long goalId);

    List<GoalCheckpoint> findByGoal_IdIn(Collection<Long> goalIds);
}
