package com.lifedata.dashboard.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.lifedata.dashboard.model.Goal;
import com.lifedata.dashboard.model.GoalProgress;

public interface GoalProgressRepository extends JpaRepository<GoalProgress, Long> {
    Optional<GoalProgress> findByGoalAndDate(Goal goal, LocalDate date);
    List<GoalProgress> findTop14ByGoalOrderByDateDesc(Goal goal);
    List<GoalProgress> findByGoalAndDateBetween(Goal goal, LocalDate start, LocalDate end);
}
