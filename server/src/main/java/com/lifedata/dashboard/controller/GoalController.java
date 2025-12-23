package com.lifedata.dashboard.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.lifedata.dashboard.dto.GoalHistoryResponse;
import com.lifedata.dashboard.dto.GoalRequest;
import com.lifedata.dashboard.dto.GoalResponse;
import com.lifedata.dashboard.model.UserAccount;
import com.lifedata.dashboard.service.CurrentUserService;
import com.lifedata.dashboard.service.GoalService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/goals")
public class GoalController {

    private final GoalService goalService;
    private final CurrentUserService currentUserService;

    public GoalController(GoalService goalService, CurrentUserService currentUserService) {
        this.goalService = goalService;
        this.currentUserService = currentUserService;
    }

    @PostMapping
    public ResponseEntity<GoalResponse> upsert(@Valid @RequestBody GoalRequest request) {
        return ResponseEntity.ok(goalService.upsert(currentUserService.currentUser(), request));
    }

    @GetMapping
    public ResponseEntity<List<GoalResponse>> list() {
        return ResponseEntity.ok(goalService.list(currentUserService.currentUser()));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<GoalHistoryResponse>> history(@PathVariable Long id) {
        UserAccount user = currentUserService.currentUser();
        return ResponseEntity.ok(goalService.history(user, id));
    }

    @PostMapping("/{id}/history")
    public ResponseEntity<GoalHistoryResponse> setProgress(@PathVariable Long id,
            @RequestParam(required = false) String date, @RequestParam double value) {
        UserAccount user = currentUserService.currentUser();
        LocalDate parsedDate = date != null ? LocalDate.parse(date) : LocalDate.now();
        return ResponseEntity.ok(goalService.setProgress(user, id, parsedDate, value));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        goalService.delete(id, currentUserService.currentUser());
        return ResponseEntity.noContent().build();
    }
}
