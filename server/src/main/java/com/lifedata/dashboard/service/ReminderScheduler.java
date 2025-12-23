package com.lifedata.dashboard.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@EnableScheduling
public class ReminderScheduler {

    private static final Logger log = LoggerFactory.getLogger(ReminderScheduler.class);

    private final ReminderService reminderService;

    public ReminderScheduler(ReminderService reminderService) {
        this.reminderService = reminderService;
    }

    // Send daily reminders at 9:05 AM server time
    @Scheduled(cron = "0 5 9 * * *")
    public void sendDaily() {
        if (!reminderService.emailRemindersEnabled()) {
            log.debug("Email reminders disabled; scheduler skipped");
            return;
        }
        log.debug("Dispatching daily goal reminders");
        reminderService.sendDailyReminders();
    }
}
