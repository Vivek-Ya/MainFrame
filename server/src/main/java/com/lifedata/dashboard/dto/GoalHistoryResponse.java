package com.lifedata.dashboard.dto;

import java.time.LocalDate;

public record GoalHistoryResponse(LocalDate date, Double value) {}
