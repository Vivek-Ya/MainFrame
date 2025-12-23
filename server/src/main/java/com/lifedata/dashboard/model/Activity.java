package com.lifedata.dashboard.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "activities")
public class Activity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private UserAccount user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActivityType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "rpg_stat")
    private RpgStat rpgStat;

    private String description;

    @Column(name = "metric_value")
    private Double value;

    private String metadata;

    private String platform; // github, leetcode, codeforces, linkedin, custom

    private String repository;

    private String difficulty;

    private Integer timeSpentMinutes;

    private Integer setsCompleted;

    private Integer repsCompleted;

    private Integer likes;

    private Integer comments;

    private Integer shares;

    @Builder.Default
    private Instant occurredAt = Instant.now();
}
