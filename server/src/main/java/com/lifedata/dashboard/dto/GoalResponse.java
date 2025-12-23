package com.lifedata.dashboard.dto;

import java.time.LocalDate;

import com.lifedata.dashboard.model.ActivityType;
import com.lifedata.dashboard.model.GoalPeriod;
import com.lifedata.dashboard.model.RpgStat;

public record GoalResponse(Long id, ActivityType activityType, GoalPeriod period, Double targetValue, Double currentValue, String name, String unit, Double customPeriodDays, LocalDate startDate, LocalDate endDate, RpgStat rpgStat) {}
