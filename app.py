import sqlite3
import os
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)
DB_NAME = "database.db"

def init_db():
    with sqlite3.connect(DB_NAME) as conn:
        with open("schema.sql", "r") as f:
            conn.executescript(f.read())

def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

@app.route("/")
def index():
    return render_template("index.html")

# 1. User Registration (Organizations and Participants)
@app.route("/api/users", methods=["GET", "POST"])
def manage_users():
    conn = get_db()
    if request.method == "POST":
        data = request.get_json()
        name = data.get("name")
        email = data.get("email")
        role = data.get("role")
        bio_criteria = data.get("bio_criteria", "")

        if not name or not email or role not in ['organization', 'participant']:
            return jsonify({"error": "Invalid registration data"}), 400

        try:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO users (name, email, role, bio_criteria) VALUES (?, ?, ?, ?)",
                (name, email, role, bio_criteria)
            )
            conn.commit()
            user_id = cursor.lastrowid
            conn.close()
            return jsonify({"id": user_id, "name": name, "role": role}), 201
        except sqlite3.IntegrityError:
            return jsonify({"error": "Email is already registered"}), 409

    role_filter = request.args.get("role")
    if role_filter:
        users = conn.execute("SELECT id, name, email, role, bio_criteria FROM users WHERE role = ?", (role_filter,)).fetchall()
    else:
        users = conn.execute("SELECT id, name, email, role, bio_criteria FROM users").fetchall()
    conn.close()
    return jsonify([dict(u) for u in users])

# 2. Challenge Management
@app.route("/api/challenges", methods=["GET", "POST"])
def manage_challenges():
    conn = get_db()
    if request.method == "POST":
        data = request.get_json()
        org_id = data.get("org_id")
        title = data.get("title")
        problem_statement = data.get("problem_statement")
        evaluation_criteria = data.get("evaluation_criteria")
        deadline = data.get("deadline")

        if not all([org_id, title, problem_statement, evaluation_criteria, deadline]):
            return jsonify({"error": "Missing required challenge fields"}), 400

        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO challenges (org_id, title, problem_statement, evaluation_criteria, deadline)
                VALUES (?, ?, ?, ?, ?)""",
            (org_id, title, problem_statement, evaluation_criteria, deadline)
        )
        conn.commit()
        challenge_id = cursor.lastrowid
        conn.close()
        return jsonify({"id": challenge_id, "title": title}), 201

    query = """
        SELECT c.id, c.title, c.problem_statement, c.evaluation_criteria, c.deadline,
                u.name AS organization_name, u.bio_criteria AS organization_bio
        FROM challenges c
        JOIN users u ON c.org_id = u.id
        ORDER BY c.created_at DESC
    """
    challenges = conn.execute(query).fetchall()
    conn.close()
    return jsonify([dict(c) for c in challenges])

# 3. Submission Portal
@app.route("/api/submissions", methods=["GET", "POST"])
def manage_submissions():
    conn = get_db()
    if request.method == "POST":
        data = request.get_json()
        challenge_id = data.get("challenge_id")
        participant_id = data.get("participant_id")
        title = data.get("title")
        summary = data.get("summary")
        deliverable_type = data.get("deliverable_type")
        deliverable_url = data.get("deliverable_url")

        if not all([challenge_id, participant_id, title, summary, deliverable_type, deliverable_url]):
            return jsonify({"error": "Missing required submission fields"}), 400

        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO submissions (challenge_id, participant_id, title, summary, deliverable_type, deliverable_url)
                VALUES (?, ?, ?, ?, ?, ?)""",
            (challenge_id, participant_id, title, summary, deliverable_type, deliverable_url)
        )
        conn.commit()
        sub_id = cursor.lastrowid
        conn.close()
        return jsonify({"id": sub_id, "title": title}), 201

    query = """
        SELECT s.id, s.title, s.summary, s.deliverable_type, s.deliverable_url, s.created_at,
                c.title AS challenge_title, p.name AS participant_name,
                e.score, e.feedback, e.status
        FROM submissions s
        JOIN challenges c ON s.challenge_id = c.id
        JOIN users p ON s.participant_id = p.id
        LEFT JOIN evaluations e ON s.id = e.submission_id
        ORDER BY s.created_at DESC
    """
    submissions = conn.execute(query).fetchall()
    conn.close()
    return jsonify([dict(s) for s in submissions])

# 4. Evaluation and Scoring by Organizations
@app.route("/api/evaluations", methods=["POST"])
def evaluate_submission():
    conn = get_db()
    data = request.get_json()
    submission_id = data.get("submission_id")
    score = data.get("score")
    feedback = data.get("feedback", "")
    status = data.get("status", "finalist")

    if not submission_id or score is None:
        return jsonify({"error": "Submission ID and score are required"}), 400

    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO evaluations (submission_id, score, feedback, status)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(submission_id) DO UPDATE SET
                score=excluded.score,
                feedback=excluded.feedback,
                status=excluded.status,
                evaluated_at=CURRENT_TIMESTAMP""",
        (submission_id, score, feedback, status)
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Evaluation recorded successfully"}), 200

# 5. Leaderboard (Ranked Results)
@app.route("/api/leaderboard", methods=["GET"])
def get_leaderboard():
    conn = get_db()
    query = """
        SELECT s.id AS submission_id, s.title AS project_title, s.deliverable_type, s.deliverable_url,
                p.name AS participant_name, c.title AS challenge_title,
                e.score, e.status, e.feedback
        FROM submissions s
        JOIN evaluations e ON s.id = e.submission_id
        JOIN users p ON s.participant_id = p.id
        JOIN challenges c ON s.challenge_id = c.id
        ORDER BY e.score DESC
    """
    leaderboard = conn.execute(query).fetchall()
    conn.close()
    return jsonify([dict(row) for row in leaderboard])

# 6. Announcements
@app.route("/api/announcements", methods=["GET", "POST"])
def manage_announcements():
    conn = get_db()
    if request.method == "POST":
        data = request.get_json()
        challenge_id = data.get("challenge_id")
        title = data.get("title")
        message = data.get("message")

        if not title or not message:
            return jsonify({"error": "Title and message are required"}), 400

        cursor = conn.cursor()
        cursor.execute("INSERT INTO announcements (challenge_id, title, message) VALUES (?, ?, ?)",
                        (challenge_id, title, message))
        conn.commit()
        announcement_id = cursor.lastrowid
        conn.close()
        return jsonify({"id": announcement_id, "title": title}), 201

    query = """
        SELECT a.id, a.title, a.message, a.created_at, c.title AS challenge_title
        FROM announcements a
        LEFT JOIN challenges c ON a.challenge_id = c.id
        ORDER BY a.created_at DESC
    """
    announcements = conn.execute(query).fetchall()
    conn.close()
    return jsonify([dict(a) for a in announcements])

if __name__ == "__main__":
    if not os.path.exists(DB_NAME):
        init_db()
    app.run(debug=True, port=5000)