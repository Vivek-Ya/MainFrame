package com.lifedata.dashboard.dto;

import java.time.LocalDate;

import com.lifedata.dashboard.model.ActivityType;
import com.lifedata.dashboard.model.GoalPeriod;
import com.lifedata.dashboard.model.RpgStat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record GoalRequest(
	@NotNull ActivityType activityType,
	@NotNull GoalPeriod period,
	@NotNull @PositiveOrZero Double targetValue,
	@NotBlank @Size(max = 120) String name,
	@Size(max = 32) String unit,
	@Positive Double customPeriodDays,
	RpgStat rpgStat,
	LocalDate startDate,
	LocalDate endDate) {}
