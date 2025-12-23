package com.lifedata.dashboard.service;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.lifedata.dashboard.dto.ActivityRequest;
import com.lifedata.dashboard.dto.ActivityResponse;
import com.lifedata.dashboard.model.Activity;
import com.lifedata.dashboard.model.ActivityType;
import com.lifedata.dashboard.model.Goal;
import com.lifedata.dashboard.model.GoalPeriod;
import com.lifedata.dashboard.model.RpgStat;
import com.lifedata.dashboard.model.UserAccount;
import com.lifedata.dashboard.repository.ActivityRepository;
import com.lifedata.dashboard.repository.GoalRepository;

@Service
public class ActivityService {

    private final ActivityRepository activityRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final GoalRepository goalRepository;

        private static final Map<ActivityType, RpgStat> DEFAULT_STAT_BY_TYPE = Map.of(
            ActivityType.GITHUB_COMMITS, RpgStat.DEX,
            ActivityType.STUDY, RpgStat.INT,
            ActivityType.GYM, RpgStat.STR,
            ActivityType.LINKEDIN_POST, RpgStat.CHA,
            ActivityType.DSA, RpgStat.WIS,
            ActivityType.CUSTOM, RpgStat.VIT);

    public ActivityService(ActivityRepository activityRepository, SimpMessagingTemplate messagingTemplate, GoalRepository goalRepository) {
        this.activityRepository = activityRepository;
        this.messagingTemplate = messagingTemplate;
        this.goalRepository = goalRepository;
    }

    public ActivityResponse addActivity(UserAccount user, ActivityRequest request) {
        Activity activity = Activity.builder()
                .user(user)
                .type(request.type())
                .rpgStat(resolveRpgStat(request))
                .description(request.description())
                .value(request.value())
                .metadata(request.metadata())
                .platform(request.platform())
                .repository(request.repository())
                .difficulty(request.difficulty())
                .timeSpentMinutes(request.timeSpentMinutes())
                .setsCompleted(request.setsCompleted())
                .repsCompleted(request.repsCompleted())
                .likes(request.likes())
                .comments(request.comments())
                .shares(request.shares())
                .occurredAt(request.occurredAt() != null ? request.occurredAt() : Instant.now())
                .build();
        Activity saved = activityRepository.save(activity);
        updateGoalProgress(user, saved);
        ActivityResponse response = toResponse(saved);
        messagingTemplate.convertAndSend("/topic/activity", response);
        return response;
    }

    public List<ActivityResponse> feed(UserAccount user, int limit) {
        return activityRepository.findTop50ByUserOrderByOccurredAtDesc(user).stream()
                .limit(Math.max(1, Math.min(limit, 50)))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<ActivityResponse> recent(UserAccount user) {
        Instant from = Instant.now().minus(30, ChronoUnit.DAYS);
        return activityRepository.findByUserAndOccurredAtBetween(user, from, Instant.now())
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<ActivityResponse> byType(UserAccount user, ActivityType type) {
        return activityRepository.findByUserAndType(user, type)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    private void updateGoalProgress(UserAccount user, Activity activity) {
        if (activity.getType() == null) {
            return;
        }
        List<Goal> goals = goalRepository.findByUserAndActivityType(user, activity.getType());
        if (goals.isEmpty()) {
            return;
        }
        ZoneId zone = ZoneId.of(user.getTimezone() != null ? user.getTimezone() : ZoneId.systemDefault().getId());
        Instant now = Instant.now();
        for (Goal goal : goals) {
            Instant start = startForPeriod(goal.getPeriod(), zone);
            Instant end = now;
            if (goal.getStartDate() != null) {
                start = goal.getStartDate().atStartOfDay(zone).toInstant();
            }
            if (goal.getEndDate() != null) {
                end = goal.getEndDate().plusDays(1).atStartOfDay(zone).toInstant();
            }
            double sum = activityRepository.findByUserAndTypeAndOccurredAtBetween(user, activity.getType(), start, end)
                    .stream().mapToDouble(a -> a.getValue() != null ? a.getValue() : 1.0).sum();
            goal.setCurrentValue(sum);
        }
        goalRepository.saveAll(goals);
    }

    private Instant startForPeriod(GoalPeriod period, ZoneId zone) {
        LocalDate today = LocalDate.now(zone);
        return switch (period) {
            case DAILY -> today.atStartOfDay(zone).toInstant();
            case WEEKLY -> today.with(DayOfWeek.MONDAY).atStartOfDay(zone).toInstant();
            case MONTHLY -> today.withDayOfMonth(1).atStartOfDay(zone).toInstant();
            case QUARTERLY -> today.withMonth(((today.getMonthValue() - 1) / 3) * 3 + 1).withDayOfMonth(1).atStartOfDay(zone).toInstant();
            case CUSTOM -> today.atStartOfDay(zone).toInstant();
        };
    }

    private ActivityResponse toResponse(Activity activity) {
        return new ActivityResponse(
                activity.getId(),
                activity.getType(),
                activity.getRpgStat(),
                activity.getDescription(),
                activity.getValue(),
                activity.getMetadata(),
                activity.getOccurredAt(),
                activity.getPlatform(),
                activity.getRepository(),
                activity.getDifficulty(),
                activity.getTimeSpentMinutes(),
                activity.getSetsCompleted(),
                activity.getRepsCompleted(),
                activity.getLikes(),
                activity.getComments(),
                activity.getShares());
    }

    private RpgStat resolveRpgStat(ActivityRequest request) {
        if (request.rpgStat() != null) {
            return request.rpgStat();
        }
        return DEFAULT_STAT_BY_TYPE.getOrDefault(request.type(), RpgStat.WIS);
    }
}
