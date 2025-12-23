package com.lifedata.dashboard.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.lifedata.dashboard.model.ActivityType;
import com.lifedata.dashboard.model.Goal;
import com.lifedata.dashboard.model.GoalPeriod;
import com.lifedata.dashboard.model.UserAccount;

public interface GoalRepository extends JpaRepository<Goal, Long> {
    List<Goal> findByUser(UserAccount user);
    Optional<Goal> findByUserAndActivityTypeAndPeriod(UserAccount user, ActivityType type, GoalPeriod period);
    List<Goal> findByUserAndActivityType(UserAccount user, ActivityType type);
}
