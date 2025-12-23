package com.lifedata.dashboard.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import com.lifedata.dashboard.dto.AchievementResponse;
import com.lifedata.dashboard.dto.LeaderboardEntry;
import com.lifedata.dashboard.model.UserAccount;

@Service
public class InsightsService {

    public List<LeaderboardEntry> leaderboard(UserAccount user) {
        // Placeholder leaderboard combining the current user and dummy peers.
        List<LeaderboardEntry> entries = new ArrayList<>();
        entries.add(new LeaderboardEntry(user.getEmail(), "productivityScore", 82.0, 1));
        entries.add(new LeaderboardEntry("peer.alex", "productivityScore", 75.0, 2));
        entries.add(new LeaderboardEntry("peer.jordan", "productivityScore", 68.0, 3));
        return entries;
    }

    public List<AchievementResponse> achievements(UserAccount user) {
        List<AchievementResponse> achievements = new ArrayList<>();
        achievements.add(new AchievementResponse("Consistency", "Log activity 5 days in a row", 0.8, false));
        achievements.add(new AchievementResponse("Closer", "Reach 80% of weekly goals", 0.6, false));
        achievements.add(new AchievementResponse("Ship It", "50 GitHub commits", 1.0, true));
        return achievements;
    }
}
