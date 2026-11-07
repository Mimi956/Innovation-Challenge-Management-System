DROP TABLE IF EXISTS announcements;
DROP TABLE IF EXISTS evaluations;
DROP TABLE IF EXISTS submissions;
DROP TABLE IF EXISTS challenges;
DROP TABLE IF EXISTS users;

-- User accounts (both organizations and participants)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('organization', 'participant')),
    bio_criteria TEXT, -- Organizations describe their mission and default evaluation criteria here
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Challenges hosted by organizations
CREATE TABLE challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    problem_statement TEXT NOT NULL,
    evaluation_criteria TEXT NOT NULL,
    deadline DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES users(id)
);

-- Submissions/Proposals from participants (docs, website, video links)
CREATE TABLE submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenge_id INTEGER NOT NULL,
    participant_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    deliverable_type TEXT NOT NULL CHECK(deliverable_type IN ('website', 'video', 'documentation', 'repository', 'other')),
    deliverable_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id),
    FOREIGN KEY (participant_id) REFERENCES users(id)
);

-- Organization evaluations and scorings
CREATE TABLE evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER UNIQUE NOT NULL,
    score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 100),
    feedback TEXT,
    status TEXT NOT NULL DEFAULT 'under_review' CHECK(status IN ('under_review', 'finalist', 'winner', 'rejected')),
    evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES submissions(id)
);

-- System-wide announcements and challenge result broadcasts
CREATE TABLE announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenge_id INTEGER,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id)
);

-- Seed initial organizations, participants, and a challenge
INSERT INTO users (name, email, role, bio_criteria) VALUES
('TechCorp Labs', 'contact@techcorp.io', 'organization', 'Enterprise AI focused. Criteria: 1. Novelty (30%), 2. Technical Feasibility (40%), 3. Business Impact (30%).'),
('GreenFuture Foundation', 'hello@greenfuture.org', 'organization', 'Sustainability innovation hub. Criteria: Scalability, carbon offset potential, and minimal deployment cost.'),
('Alice Johnson', 'alice@gmail.com', 'participant', 'Full-stack AI developer and researcher.'),
('Bob Smith', 'bob@gmail.com', 'participant', 'Robotics and clean-tech enthusiast.');

INSERT INTO challenges (org_id, title, problem_statement, evaluation_criteria, deadline) VALUES
(1, 'AI-Driven Supply Chain Resilience', 'Traditional supply chains cannot adapt in real-time to logistical disruption. Build an automated optimization model.', 'Technical novelty (30%), Feasibility (40%), Impact (30%)', '2026-12-15');

INSERT INTO submissions (challenge_id, participant_id, title, summary, deliverable_type, deliverable_url) VALUES
(1, 3, 'SmartRoute AI', 'Predictive routing system optimizing freight delivery times using neural nets.', 'website', 'https://github.com/example/smartroute');

INSERT INTO evaluations (submission_id, score, feedback, status) VALUES
(1, 92, 'Exceptional prototype with clear code documentation.', 'finalist');

INSERT INTO announcements (challenge_id, title, message) VALUES
(1, 'Finalists Announced for AI Supply Chain Challenge', 'Evaluations for the first round are complete. Check the public leaderboard for top scores!');