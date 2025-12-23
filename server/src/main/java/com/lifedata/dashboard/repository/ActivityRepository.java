package com.lifedata.dashboard.repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.lifedata.dashboard.model.Activity;
import com.lifedata.dashboard.model.ActivityType;
import com.lifedata.dashboard.model.UserAccount;

public interface ActivityRepository extends JpaRepository<Activity, Long> {
    List<Activity> findByUserAndOccurredAtBetween(UserAccount user, Instant from, Instant to);
    List<Activity> findByUser(UserAccount user);
    List<Activity> findByUserAndType(UserAccount user, ActivityType type);
    List<Activity> findByUserAndTypeAndOccurredAtBetween(UserAccount user, ActivityType type, Instant from, Instant to);
    List<Activity> findTop50ByUserOrderByOccurredAtDesc(UserAccount user);
}
