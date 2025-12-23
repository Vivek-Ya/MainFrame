package com.lifedata.dashboard.dto;

public record LeaderboardEntry(String user, String metric, Double value, int rank) {}
