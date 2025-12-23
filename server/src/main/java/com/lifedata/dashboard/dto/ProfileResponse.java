package com.lifedata.dashboard.dto;

import java.time.OffsetDateTime;
import java.util.Set;

public record ProfileResponse(Long id, String name, String email, String themePreference,
                              Boolean notificationsEnabled, Boolean weeklyEmailEnabled,
                              String timezone, Set<String> trackedActivities,
                              OffsetDateTime passwordResetExpiry, String avatarUrl, String gender) {}
