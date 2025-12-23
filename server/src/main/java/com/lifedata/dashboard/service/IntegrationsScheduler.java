package com.lifedata.dashboard.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.lifedata.dashboard.dto.ActivityRequest;
import com.lifedata.dashboard.model.ActivityType;
import com.lifedata.dashboard.model.UserAccount;
import com.lifedata.dashboard.repository.UserAccountRepository;

@Component
@EnableScheduling
public class IntegrationsScheduler {

    private static final Logger log = LoggerFactory.getLogger(IntegrationsScheduler.class);

    private final ActivityService activityService;
    private final UserAccountRepository userAccountRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${integration.target-email:}")
    private String targetEmail;

    @Value("${integration.github.enabled:false}")
    private boolean githubEnabled;

    @Value("${integration.github.token:}")
    private String githubToken;

    @Value("${integration.github.username:}")
    private String githubUsername;

    @Value("${integration.github.since-minutes:180}")
    private int githubSinceMinutes;

    @Value("${integration.leetcode.enabled:false}")
    private boolean leetEnabled;

    @Value("${integration.leetcode.cookie:}")
    private String leetCookie;

    @Value("${integration.leetcode.username:}")
    private String leetUsername;

    @Value("${integration.calendar.enabled:false}")
    private boolean calendarEnabled;

    @Value("${integration.calendar.ics-url:}")
    private String calendarIcsUrl;

    public IntegrationsScheduler(ActivityService activityService, UserAccountRepository userAccountRepository) {
        this.activityService = activityService;
        this.userAccountRepository = userAccountRepository;
    }

    @Scheduled(cron = "0 0 * * * *")
    public void syncGitHub() {
        if (!githubEnabled) {
            log.trace("GitHub sync disabled");
            return;
        }
        if (isBlank(githubToken) || isBlank(githubUsername)) {
            log.warn("GitHub sync skipped: token/username missing");
            return;
        }
        UserAccount user = resolveTargetUser();
        if (user == null) {
            return;
        }
        try {
            List<IntegrationEvent> events = fetchGitHubPushEvents();
            persistEvents(user, events);
            log.info("GitHub sync stored {} events", events.size());
        } catch (Exception ex) {
            log.warn("GitHub sync failed: {}", ex.getMessage(), ex);
        }
    }

    @Scheduled(cron = "0 30 * * * *")
    public void syncLeetCode() {
        if (!leetEnabled) {
            log.trace("LeetCode sync disabled");
            return;
        }
        if (isBlank(leetCookie) || isBlank(leetUsername)) {
            log.warn("LeetCode sync skipped: cookie/username missing");
            return;
        }
        UserAccount user = resolveTargetUser();
        if (user == null) {
            return;
        }
        try {
            List<IntegrationEvent> events = fetchLeetCodeAccepted();
            persistEvents(user, events);
            log.info("LeetCode sync stored {} events", events.size());
        } catch (Exception ex) {
            log.warn("LeetCode sync failed: {}", ex.getMessage(), ex);
        }
    }

    @Scheduled(cron = "0 */15 * * * *")
    public void syncCalendar() {
        if (!calendarEnabled) {
            log.trace("Calendar sync disabled");
            return;
        }
        if (isBlank(calendarIcsUrl)) {
            log.warn("Calendar sync skipped: ICS URL missing");
            return;
        }
        UserAccount user = resolveTargetUser();
        if (user == null) {
            return;
        }
        try {
            // Placeholder: ICS parsing can be added with ical4j; for now we log intent.
            log.info("Calendar sync placeholder executed (no events ingested yet)");
        } catch (Exception ex) {
            log.warn("Calendar sync failed: {}", ex.getMessage(), ex);
        }
    }

    private UserAccount resolveTargetUser() {
        if (isBlank(targetEmail)) {
            log.warn("Integration target email not set; skipping integrations");
            return null;
        }
        return userAccountRepository.findByEmail(targetEmail.toLowerCase()).orElseGet(() -> {
            log.warn("Integration target user not found for email {}", targetEmail);
            return null;
        });
    }

    private void persistEvents(UserAccount user, List<IntegrationEvent> events) {
        if (events.isEmpty()) {
            return;
        }
        for (IntegrationEvent event : events) {
            ActivityRequest request = new ActivityRequest(
                    event.type(),
                    null,
                    event.description(),
                    event.value(),
                    event.metadata(),
                    event.occurredAt(),
                    event.platform(),
                    event.repository(),
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null);
            activityService.addActivity(user, request);
        }
    }

    private List<IntegrationEvent> fetchGitHubPushEvents() {
        String url = "https://api.github.com/users/" + githubUsername + "/events/public";
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(githubToken);
        headers.set(HttpHeaders.ACCEPT, "application/vnd.github+json");
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<JsonNode[]> response = restTemplate.exchange(url, HttpMethod.GET, entity, JsonNode[].class);
        JsonNode[] body = response.getBody();
        List<IntegrationEvent> events = new ArrayList<>();
        if (body == null) {
            return events;
        }
        Instant cutoff = Instant.now().minus(githubSinceMinutes, ChronoUnit.MINUTES);
        for (JsonNode node : body) {
            if (!"PushEvent".equals(node.path("type").asText())) {
                continue;
            }
            Instant created = parseInstant(node.path("created_at").asText(null));
            if (created == null || created.isBefore(cutoff)) {
                continue;
            }
            JsonNode payload = node.path("payload");
            int commitCount = payload.path("commits").isArray() ? payload.path("commits").size() : 0;
            if (commitCount <= 0) {
                continue;
            }
            String repo = node.path("repo").path("name").asText("");
            String ref = payload.path("ref").asText("");
            String desc = "GitHub push to " + repo + (ref.isEmpty() ? "" : " (" + ref.replace("refs/heads/", "") + ")") + " — " + commitCount + " commit" + (commitCount > 1 ? "s" : "");
            events.add(new IntegrationEvent(ActivityType.GITHUB_COMMITS, desc, (double) commitCount, created, "github", repo, "ref=" + ref));
        }
        return events;
    }

    private List<IntegrationEvent> fetchLeetCodeAccepted() {
        String url = "https://leetcode.com/api/submissions/?offset=0&limit=20";
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.COOKIE, leetCookie);
        headers.set(HttpHeaders.ACCEPT, "application/json");
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<JsonNode> response = restTemplate.exchange(url, HttpMethod.GET, entity, JsonNode.class);
        JsonNode body = response.getBody();
        List<IntegrationEvent> events = new ArrayList<>();
        if (body == null || !body.has("submissions_dump")) {
            return events;
        }
        Instant cutoff = Instant.now().minus(6, ChronoUnit.HOURS);
        for (JsonNode submission : body.path("submissions_dump")) {
            String status = submission.path("status_display").asText("");
            if (!"Accepted".equalsIgnoreCase(status)) {
                continue;
            }
            long timestamp = submission.path("timestamp").asLong(0L);
            Instant when = Instant.ofEpochSecond(timestamp);
            if (when.isBefore(cutoff)) {
                continue;
            }
            String title = submission.path("title").asText("Problem");
            String difficulty = submission.path("status_display").asText("");
            String meta = submission.path("lang").asText("");
            String desc = "LeetCode AC: " + title;
            events.add(new IntegrationEvent(ActivityType.DSA, desc, 1.0, when, "leetcode", null, "lang=" + meta + ", status=" + difficulty));
        }
        return events;
    }

    private Instant parseInstant(String value) {
        if (isBlank(value)) {
            return null;
        }
        try {
            return Instant.parse(value);
        } catch (Exception ex) {
            return null;
        }
    }

    private boolean isBlank(String v) {
        return v == null || v.trim().isEmpty();
    }

    private record IntegrationEvent(ActivityType type, String description, Double value, Instant occurredAt, String platform, String repository, String metadata) {
        IntegrationEvent {
            Objects.requireNonNull(type, "type");
            Objects.requireNonNull(description, "description");
            Objects.requireNonNull(occurredAt, "occurredAt");
        }
    }
}
