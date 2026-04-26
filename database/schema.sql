CREATE TABLE IF NOT EXISTS watched_courses (
    id          SERIAL PRIMARY KEY,
    user_phone  VARCHAR(20)  NOT NULL,
    course_code VARCHAR(20)  NOT NULL,
    term        VARCHAR(10)  NOT NULL,
    active      BOOLEAN      DEFAULT true,
    created_at  TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seat_snapshots (
    id          SERIAL PRIMARY KEY,
    course_code VARCHAR(20)  NOT NULL,
    term        VARCHAR(10)  NOT NULL,
    sections    JSONB        NOT NULL,
    scraped_at  TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id          SERIAL PRIMARY KEY,
    user_phone  VARCHAR(20)  NOT NULL,
    course_code VARCHAR(20)  NOT NULL,
    section     VARCHAR(10)  NOT NULL,
    message     TEXT         NOT NULL,
    sent_at     TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_course ON seat_snapshots(course_code, scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_watched_active ON watched_courses(active, course_code);
