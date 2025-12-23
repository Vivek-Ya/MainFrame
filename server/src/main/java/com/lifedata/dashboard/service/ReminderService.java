package com.lifedata.dashboard.service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import com.lifedata.dashboard.model.Goal;
import com.lifedata.dashboard.model.GoalProgress;
import com.lifedata.dashboard.model.UserAccount;
import com.lifedata.dashboard.repository.GoalProgressRepository;
import com.lifedata.dashboard.repository.GoalRepository;
import com.lifedata.dashboard.repository.UserAccountRepository;

@Service
public class ReminderService {

    private static final Logger log = LoggerFactory.getLogger(ReminderService.class);

    private final GoalRepository goalRepository;
    private final GoalProgressRepository goalProgressRepository;
    private final UserAccountRepository userRepository;
    private final JavaMailSender mailSender;
    private final boolean emailRemindersEnabled;

    public ReminderService(GoalRepository goalRepository, GoalProgressRepository goalProgressRepository,
            UserAccountRepository userRepository, JavaMailSender mailSender,
            @Value("${feature.email-reminders.enabled:false}") boolean emailRemindersEnabled) {
        this.goalRepository = goalRepository;
        this.goalProgressRepository = goalProgressRepository;
        this.userRepository = userRepository;
        this.mailSender = mailSender;
        this.emailRemindersEnabled = emailRemindersEnabled;
    }

    public boolean emailRemindersEnabled() {
        return emailRemindersEnabled;
    }

    public List<String> pendingGoals(UserAccount user) {
        ZoneId zone = ZoneId.of(user.getTimezone() != null ? user.getTimezone() : ZoneId.systemDefault().getId());
        LocalDate today = LocalDate.now(zone);
        List<String> pending = new ArrayList<>();
        for (Goal goal : goalRepository.findByUser(user)) {
            List<GoalProgress> progress = goalProgressRepository.findByGoalAndDateBetween(goal, today, today);
            double todaySum = progress.stream().mapToDouble(GoalProgress::getValue).sum();
            if (todaySum <= 0.0) {
                pending.add(goal.getActivityType() + " · " + (goal.getTargetValue() != null ? goal.getTargetValue() : 0));
            }
        }
        return pending;
    }

    public void sendReminderEmail(UserAccount user) {
        if (!emailRemindersEnabled) {
            log.debug("Email reminders disabled; skipping send for {}", user.getEmail());
            return;
        }
        if (Boolean.FALSE.equals(user.getNotificationsEnabled())) {
            return;
        }
        List<String> pending = pendingGoals(user);
        if (pending.isEmpty()) return;
        if (mailSender == null) {
            log.info("Mail sender not configured; would notify {} with {} pending goals", user.getEmail(), pending.size());
            return;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(user.getEmail());
            msg.setSubject("Goal reminder for today");
            msg.setText("Hi %s,\n\nHere are your open goals for today:\n%s\n\nStay on it!".formatted(
                    user.getName(), String.join("\n", pending)));
            mailSender.send(msg);
            log.info("Sent reminder email to {}", user.getEmail());
        } catch (Exception ex) {
            log.warn("Failed to send reminder email to {}: {}", user.getEmail(), ex.getMessage());
        }
    }

    public void sendDailyReminders() {
        if (!emailRemindersEnabled) {
            log.debug("Email reminders disabled; skipping daily dispatch");
            return;
        }
        userRepository.findAll().forEach(this::sendReminderEmail);
    }
}
