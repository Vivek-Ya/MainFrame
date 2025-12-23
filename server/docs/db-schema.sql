-- Canonical database schema for Life Dashboard
-- Compatible with MySQL 8+/MariaDB 10.6+ and H2 (MySQL mode)

CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    theme_preference VARCHAR(32),
    notifications_enabled BOOLEAN DEFAULT TRUE,
    weekly_email_enabled BOOLEAN DEFAULT FALSE,
    timezone VARCHAR(64),
    password_reset_token VARCHAR(255),
    password_reset_expiry TIMESTAMP NULL,
    avatar_url VARCHAR(512),
    gender VARCHAR(32),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_roles (
    user_id BIGINT NOT NULL,
    role VARCHAR(64) NOT NULL,
    PRIMARY KEY (user_id, role),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE user_tracked_activities (
    user_id BIGINT NOT NULL,
    activity_key VARCHAR(128) NOT NULL,
    PRIMARY KEY (user_id, activity_key),
    CONSTRAINT fk_user_tracked_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE activities (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT,
    type VARCHAR(64) NOT NULL,
    description TEXT,
    metric_value DOUBLE,
    metadata TEXT,
    platform VARCHAR(128),
    repository VARCHAR(256),
    rpg_stat VARCHAR(16),
    difficulty VARCHAR(64),
    time_spent_minutes INT,
    sets_completed INT,
    reps_completed INT,
    likes INT,
    comments INT,
    shares INT,
    occurred_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE goals (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    activity_type VARCHAR(64) NOT NULL,
    name VARCHAR(120) NOT NULL,
    period VARCHAR(32) NOT NULL,
    target_value DOUBLE NOT NULL,
    custom_period_days DOUBLE,
    unit VARCHAR(32),
    current_value DOUBLE,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_goal_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_goals_user ON goals(user_id);

CREATE TABLE goal_progress (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    goal_id BIGINT NOT NULL,
    progress_date DATE NOT NULL,
    metric_value DOUBLE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_goal_progress_goal FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
    CONSTRAINT uq_goal_progress UNIQUE (goal_id, progress_date)
);

-- Optional derived views for analytics can be added on top of these base tables.
