package com.lifedata.dashboard.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.lifedata.dashboard.service.CurrentUserService;
import com.lifedata.dashboard.service.ReminderService;

@RestController
@RequestMapping("/api/reminders")
public class ReminderController {

    private final ReminderService reminderService;
    private final CurrentUserService currentUserService;

    public ReminderController(ReminderService reminderService, CurrentUserService currentUserService) {
        this.reminderService = reminderService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public ResponseEntity<List<String>> pending() {
        return ResponseEntity.ok(reminderService.pendingGoals(currentUserService.currentUser()));
    }

    @PostMapping("/email")
    public ResponseEntity<Void> sendEmail() {
        if (!reminderService.emailRemindersEnabled()) {
            return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
        }
        reminderService.sendReminderEmail(currentUserService.currentUser());
        return ResponseEntity.accepted().build();
    }
}
