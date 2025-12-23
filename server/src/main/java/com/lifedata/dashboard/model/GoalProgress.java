package com.lifedata.dashboard.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "goal_progress", uniqueConstraints = @UniqueConstraint(columnNames = {"goal_id", "progress_date"}))
public class GoalProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "goal_id", nullable = false)
    private Goal goal;

    @Column(name = "progress_date", nullable = false)
    private LocalDate date;

    @Column(name = "metric_value", nullable = false)
    private Double value;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
