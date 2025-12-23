package com.lifedata.dashboard.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.lifedata.dashboard.dto.AdminMetricsResponse;
import com.lifedata.dashboard.repository.ActivityRepository;
import com.lifedata.dashboard.repository.GoalRepository;
import com.lifedata.dashboard.repository.UserAccountRepository;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserAccountRepository userRepository;
    private final ActivityRepository activityRepository;
    private final GoalRepository goalRepository;

    public AdminController(UserAccountRepository userRepository, ActivityRepository activityRepository, GoalRepository goalRepository) {
        this.userRepository = userRepository;
        this.activityRepository = activityRepository;
        this.goalRepository = goalRepository;
    }

    @GetMapping("/metrics")
    public ResponseEntity<AdminMetricsResponse> metrics() {
        return ResponseEntity.ok(new AdminMetricsResponse(userRepository.count(), activityRepository.count(), goalRepository.count()));
    }
}
