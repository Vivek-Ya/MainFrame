package com.lifedata.dashboard.model;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "users")
public class UserAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "role")
    @Builder.Default
    private Set<Role> roles = new HashSet<>();

    private String themePreference;

    @Builder.Default
    private Boolean notificationsEnabled = Boolean.TRUE;

    @Builder.Default
    private Boolean weeklyEmailEnabled = Boolean.FALSE;

    private String timezone;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_tracked_activities", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "activity_key")
    @Builder.Default
    private Set<String> trackedActivities = new HashSet<>();

    private String passwordResetToken;

    private OffsetDateTime passwordResetExpiry;

    private String avatarUrl;

    private String gender;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
