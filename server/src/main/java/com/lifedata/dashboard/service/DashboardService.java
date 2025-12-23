package com.lifedata.dashboard.service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.lifedata.dashboard.dto.DashboardSummary;
import com.lifedata.dashboard.model.Activity;
import com.lifedata.dashboard.model.ActivityType;
import com.lifedata.dashboard.model.Goal;
import com.lifedata.dashboard.model.RpgStat;
import com.lifedata.dashboard.model.UserAccount;
import com.lifedata.dashboard.repository.ActivityRepository;
import com.lifedata.dashboard.repository.GoalRepository;

@Service
public class DashboardService {

    private final ActivityRepository activityRepository;
    private final GoalRepository goalRepository;

    public DashboardService(ActivityRepository activityRepository, GoalRepository goalRepository) {
        this.activityRepository = activityRepository;
        this.goalRepository = goalRepository;
    }

    public DashboardSummary summary(UserAccount user) {
        List<Activity> activities = activityRepository.findByUser(user);
        List<Goal> goals = goalRepository.findByUser(user);

        Map<String, Double> breakdown = new java.util.HashMap<>();
        Map<ActivityType, Double> totals = new EnumMap<>(ActivityType.class);
        for (Activity activity : activities) {
            totals.merge(activity.getType(), activity.getValue() != null ? activity.getValue() : 1.0, Double::sum);
        }
        totals.forEach((type, value) -> breakdown.put(type.name(), value));

        double productivityScore = totals.values().stream().mapToDouble(Double::doubleValue).sum();

        List<DashboardSummary.ActivityTrend> trends = buildTrends(activities);
        List<DashboardSummary.Streak> streaks = buildStreaks(activities, user);
        List<DashboardSummary.Milestone> milestones = buildMilestones(totals);
        List<DashboardSummary.GoalProgress> goalProgress = buildGoalProgress(goals);
        Map<String, Double> rpgStats = buildRpgStats(activities);

        return new DashboardSummary(productivityScore, breakdown, rpgStats, trends, streaks, milestones, goalProgress);
    }

    private List<DashboardSummary.ActivityTrend> buildTrends(List<Activity> activities) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd")
                .withZone(ZoneId.systemDefault());
        Map<ActivityType, Map<String, Double>> grouped = new EnumMap<>(ActivityType.class);
        for (Activity activity : activities) {
            String day = formatter.format(activity.getOccurredAt());
            grouped.computeIfAbsent(activity.getType(), t -> new java.util.HashMap<>())
                    .merge(day, activity.getValue() != null ? activity.getValue() : 1.0, Double::sum);
        }
        List<DashboardSummary.ActivityTrend> trends = new ArrayList<>();
        grouped.forEach((type, dayMap) -> {
            List<DashboardSummary.TrendPoint> points = dayMap.entrySet().stream()
                    .sorted(Map.Entry.comparingByKey())
                    .map(e -> new DashboardSummary.TrendPoint(e.getKey(), e.getValue()))
                    .toList();
            trends.add(new DashboardSummary.ActivityTrend(type.name(), points));
        });
        return trends;
    }

    private List<DashboardSummary.Streak> buildStreaks(List<Activity> activities, UserAccount user) {
        ZoneId zone = ZoneId.of(user.getTimezone() != null ? user.getTimezone() : ZoneId.systemDefault().getId());
        Map<ActivityType, Set<LocalDate>> datesByType = new EnumMap<>(ActivityType.class);
        for (Activity activity : activities) {
            LocalDate day = LocalDate.ofInstant(activity.getOccurredAt(), zone);
            datesByType.computeIfAbsent(activity.getType(), t -> new HashSet<>()).add(day);
        }
        List<DashboardSummary.Streak> streaks = new ArrayList<>();
        LocalDate today = LocalDate.now(zone);
        datesByType.forEach((type, dates) -> {
            int length = 0;
            LocalDate cursor = today;
            while (dates.contains(cursor)) {
                length++;
                cursor = cursor.minusDays(1);
            }
            if (length > 0) {
                streaks.add(new DashboardSummary.Streak(type.name(), length));
            }
        });
        return streaks;
    }

    private List<DashboardSummary.Milestone> buildMilestones(Map<ActivityType, Double> totals) {
        List<DashboardSummary.Milestone> milestones = new ArrayList<>();
        totals.forEach((type, value) -> {
            if (value >= 50) {
                milestones.add(new DashboardSummary.Milestone(type.name(), "50+ logged — great consistency"));
            } else if (value >= 20) {
                milestones.add(new DashboardSummary.Milestone(type.name(), "20+ milestone reached"));
            }
        });
        return milestones;
    }

    private Map<String, Double> buildRpgStats(List<Activity> activities) {
        Map<RpgStat, Double> totals = new EnumMap<>(RpgStat.class);
        for (RpgStat stat : RpgStat.values()) {
            totals.put(stat, 0.0);
        }
        for (Activity activity : activities) {
            RpgStat stat = activity.getRpgStat() != null ? activity.getRpgStat() : defaultStatForType(activity.getType());
            if (stat == null) {
                continue;
            }
            double value = activity.getValue() != null ? activity.getValue() : 1.0;
            totals.merge(stat, value, Double::sum);
        }

        Map<String, Double> shaped = new LinkedHashMap<>();
        for (RpgStat stat : RpgStat.values()) {
            shaped.put(stat.name(), totals.getOrDefault(stat, 0.0));
        }
        return shaped;
    }

    private RpgStat defaultStatForType(ActivityType type) {
        if (type == null) return null;
        return switch (type) {
            case GITHUB_COMMITS -> RpgStat.DEX;
            case STUDY -> RpgStat.INT;
            case GYM -> RpgStat.STR;
            case LINKEDIN_POST -> RpgStat.CHA;
            case DSA -> RpgStat.WIS;
            case CUSTOM -> RpgStat.VIT;
        };
    }

    private List<DashboardSummary.GoalProgress> buildGoalProgress(List<Goal> goals) {
        List<DashboardSummary.GoalProgress> progress = new ArrayList<>();
        for (Goal goal : goals) {
            double current = goal.getCurrentValue() != null ? goal.getCurrentValue() : 0.0;
            double target = goal.getTargetValue() != null ? goal.getTargetValue() : 0.0;
            double pct = target > 0 ? Math.min(1.0, current / target) : 0.0;
            progress.add(new DashboardSummary.GoalProgress(goal.getId(), goal.getActivityType().name(), goal.getName(), goal.getPeriod().name(), current, target, pct, goal.getUnit(), goal.getCustomPeriodDays(), goal.getRpgStat() != null ? goal.getRpgStat().name() : null));
        }
        return progress;
    }
}
