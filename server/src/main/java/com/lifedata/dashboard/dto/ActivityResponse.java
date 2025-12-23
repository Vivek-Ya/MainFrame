package com.lifedata.dashboard.dto;

import java.time.Instant;

import com.lifedata.dashboard.model.ActivityType;
import com.lifedata.dashboard.model.RpgStat;

public record ActivityResponse(
	Long id,
	ActivityType type,
	RpgStat rpgStat,
	String description,
	Double value,
	String metadata,
	Instant occurredAt,
	String platform,
	String repository,
	String difficulty,
	Integer timeSpentMinutes,
	Integer setsCompleted,
	Integer repsCompleted,
	Integer likes,
	Integer comments,
	Integer shares) {}
