package com.lifedata.dashboard.service;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.lifedata.dashboard.dto.GoalHistoryResponse;
import com.lifedata.dashboard.dto.GoalRequest;
import com.lifedata.dashboard.dto.GoalResponse;
import com.lifedata.dashboard.model.Goal;
import com.lifedata.dashboard.model.GoalPeriod;
import com.lifedata.dashboard.model.GoalProgress;
import com.lifedata.dashboard.model.UserAccount;
import com.lifedata.dashboard.repository.ActivityRepository;
import com.lifedata.dashboard.repository.GoalProgressRepository;
import com.lifedata.dashboard.repository.GoalRepository;

@Service
public class GoalService {

    private final GoalRepository goalRepository;
    private final ActivityRepository activityRepository;
    private final GoalProgressRepository goalProgressRepository;

    public GoalService(GoalRepository goalRepository, ActivityRepository activityRepository, GoalProgressRepository goalProgressRepository) {
        this.goalRepository = goalRepository;
        this.activityRepository = activityRepository;
        this.goalProgressRepository = goalProgressRepository;
    }

    public GoalResponse upsert(UserAccount user, GoalRequest request) {
        // Always create a new goal so users can have multiple goals per activity/period.
        Goal goal = Goal.builder()
                .user(user)
                .activityType(request.activityType())
                .period(request.period())
                .rpgStat(request.rpgStat())
                .name(request.name())
                .unit(request.unit())
                .customPeriodDays(request.customPeriodDays())
                .targetValue(request.targetValue())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .build();

        goal.setCurrentValue(computeCurrent(user, goal));
        Goal saved = goalRepository.save(goal);
        return toResponse(saved);
    }

    public List<GoalResponse> list(UserAccount user) {
        return goalRepository.findByUser(user).stream().map(this::toResponse).collect(Collectors.toList());
    }

        public List<GoalHistoryResponse> history(UserAccount user, Long goalId) {
        Goal goal = goalRepository.findById(goalId).filter(g -> g.getUser().getId().equals(user.getId()))
                    .orElseThrow(() -> new IllegalArgumentException("Goal not found"));
        return goalProgressRepository.findTop14ByGoalOrderByDateDesc(goal).stream()
                    .map(gp -> new GoalHistoryResponse(gp.getDate(), gp.getValue()))
                    .collect(Collectors.toList());
        }

        public GoalHistoryResponse setProgress(UserAccount user, Long goalId, LocalDate date, double value) {
        Goal goal = goalRepository.findById(goalId).filter(g -> g.getUser().getId().equals(user.getId()))
                    .orElseThrow(() -> new IllegalArgumentException("Goal not found"));
        LocalDate safeDate = date != null ? date : LocalDate.now();
        GoalProgress progress = goalProgressRepository.findByGoalAndDate(goal, safeDate)
                    .orElse(GoalProgress.builder().goal(goal).date(safeDate).value(0.0).build());
        progress.setValue(value);
        GoalProgress saved = goalProgressRepository.save(progress);
        goal.setCurrentValue(computeCurrent(user, goal));
        goalRepository.save(goal);
        return new GoalHistoryResponse(saved.getDate(), saved.getValue());
        }

    public void delete(Long id, UserAccount user) {
        goalRepository.findById(id).filter(goal -> goal.getUser().getId().equals(user.getId()))
                .ifPresent(goalRepository::delete);
    }

    private GoalResponse toResponse(Goal goal) {
        return new GoalResponse(goal.getId(), goal.getActivityType(), goal.getPeriod(), goal.getTargetValue(), goal.getCurrentValue(), goal.getName(), goal.getUnit(), goal.getCustomPeriodDays(), goal.getStartDate(), goal.getEndDate(), goal.getRpgStat());
    }

    private double computeCurrent(UserAccount user, Goal goal) {
        ZoneId zone = ZoneId.of(user.getTimezone() != null ? user.getTimezone() : ZoneId.systemDefault().getId());
        Instant start = startForPeriod(goal, zone);
        Instant end = goal.getEndDate() != null ? goal.getEndDate().plusDays(1).atStartOfDay(zone).toInstant() : Instant.now();
        if (goal.getStartDate() != null) {
            start = goal.getStartDate().atStartOfDay(zone).toInstant();
        }
        LocalDate startDate = start.atZone(zone).toLocalDate();
        LocalDate endDate = goal.getEndDate() != null ? goal.getEndDate() : LocalDate.now(zone);

        // If the goal has not been persisted yet, we cannot query goal progress; fall back to activity sum.
        if (goal.getId() == null) {
            return activitySum(user, goal, start, end);
        }

        List<GoalProgress> progress = goalProgressRepository.findByGoalAndDateBetween(goal, startDate, endDate);
        if (!progress.isEmpty()) {
            return progress.stream().mapToDouble(GoalProgress::getValue).sum();
        }
        return activitySum(user, goal, start, end);
    }

    private double activitySum(UserAccount user, Goal goal, Instant start, Instant end) {
        return activityRepository.findByUserAndTypeAndOccurredAtBetween(user, goal.getActivityType(), start, end)
                .stream()
                .mapToDouble(a -> a.getValue() != null ? a.getValue() : 1.0)
                .sum();
    }

    private Instant startForPeriod(Goal goal, ZoneId zone) {
        GoalPeriod period = goal.getPeriod();
        LocalDate today = LocalDate.now(zone);
        return switch (period) {
            case DAILY -> today.atStartOfDay(zone).toInstant();
            case WEEKLY -> today.with(DayOfWeek.MONDAY).atStartOfDay(zone).toInstant();
            case MONTHLY -> today.withDayOfMonth(1).atStartOfDay(zone).toInstant();
            case QUARTERLY -> today.withMonth(((today.getMonthValue() - 1) / 3) * 3 + 1).withDayOfMonth(1).atStartOfDay(zone).toInstant();
            case CUSTOM -> {
                double days = goal.getCustomPeriodDays() != null && goal.getCustomPeriodDays() > 0 ? goal.getCustomPeriodDays() : 7.0;
                long minutes = Math.max(0, Math.round(days * 24 * 60));
                yield Instant.now().minus(java.time.Duration.ofMinutes(minutes));
            }
        };
    }
}
