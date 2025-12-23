package com.lifedata.dashboard.dto;

import java.util.List;
import java.util.Map;

public record DashboardSummary(
        Double productivityScore,
        Map<String, Double> breakdown,
        Map<String, Double> rpgStats,
        List<ActivityTrend> trends,
        List<Streak> streaks,
        List<Milestone> milestones,
        List<GoalProgress> goals) {
    public record ActivityTrend(String label, List<TrendPoint> points) {}
    public record TrendPoint(String period, Double value) {}
    public record Streak(String activityType, int length) {}
    public record Milestone(String activityType, String message) {}
    public record GoalProgress(Long id, String activityType, String name, String period, Double currentValue, Double targetValue, Double progress, String unit, Double customPeriodDays, String rpgStat) {}
}
