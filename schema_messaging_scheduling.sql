-- ============================================================
-- Member 5: Messaging & Scheduling — database schema
-- Run this against the team database (c237_026_team4_userdb)
-- ============================================================

-- Minimal users table, only here as a placeholder/reference in case
-- Member 1 (Registration) hasn't created it yet. If it already exists
-- with these column names (id, username), this does nothing (IF NOT EXISTS).
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100),
    password VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user'
);

-- Chat messages between two users
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    message_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read TINYINT(1) DEFAULT 0,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);

-- Booked learning sessions between two users
-- (named learning_sessions, not "sessions", to avoid confusion with
-- Express's own session store)
CREATE TABLE IF NOT EXISTS learning_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requester_id INT NOT NULL,
    partner_id INT NOT NULL,
    skill_topic VARCHAR(100),
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed', -- 'confirmed' or 'cancelled'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_id) REFERENCES users(id),
    FOREIGN KEY (partner_id) REFERENCES users(id)
);

-- Optional: a couple of test users so you can try messaging/scheduling
-- before Member 1's registration form is ready. Remove once real
-- registration is working.
-- INSERT INTO users (username, email, password) VALUES
--   ('alice', 'alice@example.com', 'placeholder'),
--   ('bob', 'bob@example.com', 'placeholder');
