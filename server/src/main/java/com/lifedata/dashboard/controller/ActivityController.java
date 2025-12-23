package com.lifedata.dashboard.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.lifedata.dashboard.dto.ActivityRequest;
import com.lifedata.dashboard.dto.ActivityResponse;
import com.lifedata.dashboard.model.ActivityType;
import com.lifedata.dashboard.service.ActivityService;
import com.lifedata.dashboard.service.CurrentUserService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/activities")
public class ActivityController {

    private final ActivityService activityService;
    private final CurrentUserService currentUserService;

    public ActivityController(ActivityService activityService, CurrentUserService currentUserService) {
        this.activityService = activityService;
        this.currentUserService = currentUserService;
    }

    @PostMapping
    public ResponseEntity<ActivityResponse> create(@Valid @RequestBody ActivityRequest request) {
        return ResponseEntity.ok(activityService.addActivity(currentUserService.currentUser(), request));
    }

    @GetMapping
    public ResponseEntity<List<ActivityResponse>> recent() {
        return ResponseEntity.ok(activityService.recent(currentUserService.currentUser()));
    }

    @GetMapping("/feed")
    public ResponseEntity<List<ActivityResponse>> feed(@RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(activityService.feed(currentUserService.currentUser(), limit));
    }

    @GetMapping(params = "type")
    public ResponseEntity<List<ActivityResponse>> byType(@RequestParam ActivityType type) {
        return ResponseEntity.ok(activityService.byType(currentUserService.currentUser(), type));
    }
}
