package com.lifedata.dashboard.dto;

import java.util.Set;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(@Size(max = 120) String name,
                                   @Size(max = 20) String themePreference,
                                   Boolean notificationsEnabled,
                                   Boolean weeklyEmailEnabled,
                                   @Size(max = 60) String timezone,
                                   Set<@Size(max = 64) String> trackedActivities,
                                   @Size(max = 255) String avatarUrl,
                                   @Size(max = 32) String gender) {}
