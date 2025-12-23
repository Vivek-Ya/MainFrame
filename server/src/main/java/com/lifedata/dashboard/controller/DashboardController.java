package com.lifedata.dashboard.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.lifedata.dashboard.dto.DashboardSummary;
import com.lifedata.dashboard.service.CurrentUserService;
import com.lifedata.dashboard.service.DashboardService;
import com.lifedata.dashboard.service.InsightsService;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;
    private final CurrentUserService currentUserService;
    private final InsightsService insightsService;

    public DashboardController(DashboardService dashboardService, CurrentUserService currentUserService, InsightsService insightsService) {
        this.dashboardService = dashboardService;
        this.currentUserService = currentUserService;
        this.insightsService = insightsService;
    }

    @GetMapping
    public ResponseEntity<DashboardSummary> summary() {
        return ResponseEntity.ok(dashboardService.summary(currentUserService.currentUser()));
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<?> leaderboard() {
        return ResponseEntity.ok(insightsService.leaderboard(currentUserService.currentUser()));
    }

    @GetMapping("/achievements")
    public ResponseEntity<?> achievements() {
        return ResponseEntity.ok(insightsService.achievements(currentUserService.currentUser()));
    }
}
