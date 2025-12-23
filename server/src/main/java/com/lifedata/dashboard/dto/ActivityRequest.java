package com.lifedata.dashboard.dto;

import java.time.Instant;

import com.lifedata.dashboard.model.ActivityType;
import com.lifedata.dashboard.model.RpgStat;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record ActivityRequest(
    @NotNull ActivityType type,
    RpgStat rpgStat,
    @Size(max = 255) String description,
    @PositiveOrZero Double value,
    @Size(max = 255) String metadata,
    Instant occurredAt,
    @Size(max = 64) String platform,
    @Size(max = 255) String repository,
    @Size(max = 64) String difficulty,
    @PositiveOrZero Integer timeSpentMinutes,
    @PositiveOrZero Integer setsCompleted,
    @PositiveOrZero Integer repsCompleted,
    @PositiveOrZero Integer likes,
    @PositiveOrZero Integer comments,
    @PositiveOrZero Integer shares) {}
