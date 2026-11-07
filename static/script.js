document.addEventListener("DOMContentLoaded", () => {
    fetchAll();

    // 1. User Registration Handler
    document.getElementById("registerForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const payload = {
            name: document.getElementById("regName").value,
            email: document.getElementById("regEmail").value,
            role: document.getElementById("regRole").value,
            bio_criteria: document.getElementById("regBio").value
        };

        const res = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("Registration successful!");
            e.target.reset();
            fetchAll();
        }   else {
            const err = await res.json();
            alert(`Registration failed: ${err.error}`);
        }
    });

    // 2. Challenge Creation Handler
    document.getElementById("challengeForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const payload = {
            org_id: document.getElementById("chOrgSelect").value,
            title: document.getElementById("chTitle").value,
            problem_statement: document.getElementById("chProblem").value,
            evaluation_criteria: document.getElementById("chCriteria").value,
            deadline: document.getElementById("chDeadline").value
        };

        const res = await fetch("/api/challenges", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("Challenge published successfully!");
            e.target.reset();
            fetchAll();
        }
    });

  // 3. Idea Submission Handler
    document.getElementById("submissionForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const payload = {
            challenge_id: document.getElementById("subChallengeSelect").value,
            participant_id: document.getElementById("subParticipantSelect").value,
            title: document.getElementById("subTitle").value,
            summary: document.getElementById("subSummary").value,
            deliverable_type: document.getElementById("subType").value,
            deliverable_url: document.getElementById("subUrl").value
        };

        const res = await fetch("/api/submissions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("Proposal submitted successfully!");
            e.target.reset();
            fetchAll();
        }
    });
});

async function fetchAll() {
    await Promise.all([
        loadAnnouncements(),
        loadUsers(),
        loadChallenges(),
        loadSubmissions(),
        loadLeaderboard()
    ]);
}

async function loadAnnouncements() {
    const res = await fetch("/api/announcements");
    const data = await res.json();
    const container = document.getElementById("announcementList");
    container.innerHTML = data.map(a => `
        <div style="margin-bottom: 0.75rem;">
            <strong>📢 ${a.title}</strong>
            ${a.challenge_title ? `<em>(Challenge: ${a.challenge_title})</em>` : ''}
            <p>${a.message}</p>
        </div>
    `).join("");
}

async function loadUsers() {
    const res = await fetch("/api/users");
    const users = await res.json();

    const orgSelect = document.getElementById("chOrgSelect");
    const partSelect = document.getElementById("subParticipantSelect");

    orgSelect.innerHTML = '<option value="">Select Hosting Organization</option>';
    partSelect.innerHTML = '<option value="">Select Participant</option>';

    users.forEach(u => {
        if (u.role === "organization") {
            orgSelect.innerHTML += `<option value="${u.id}">${u.name}</option>`;
        } else {
            partSelect.innerHTML += `<option value="${u.id}">${u.name} (${u.email})</option>`;
        }
    });
}

async function loadChallenges() {
    const res = await fetch("/api/challenges");
    const challenges = await res.json();

    const subSelect = document.getElementById("subChallengeSelect");
    subSelect.innerHTML = '<option value="">Select Challenge</option>';

    const container = document.getElementById("challengeList");
    container.innerHTML = "";

    challenges.forEach(c => {
        subSelect.innerHTML += `<option value="${c.id}">${c.title}</option>`;
        container.innerHTML += `
            <div class="item-card">
                <h4>${c.title}</h4>
                <p><strong>Host Organization:</strong> ${c.organization_name}</p>
                <p><strong>Organization Criteria / Bio:</strong> ${c.organization_bio || "None specified"}</p>
                <hr style="margin: 0.5rem 0; border: 0; border-top: 1px solid #e2e8f0;">
                <p><strong>Problem Statement:</strong> ${c.problem_statement}</p>
                <p><strong>Challenge Evaluation Criteria:</strong> ${c.evaluation_criteria}</p>
                <p><strong>Deadline:</strong> ${c.deadline}</p>
            </div>
        `;
    });
}

async function loadSubmissions() {
    const res = await fetch("/api/submissions");
    const subs = await res.json();
    const container = document.getElementById("submissionList");

    if (!subs.length) {
        container.innerHTML = "<p>No proposals submitted yet.</p>";
        return;
    }

    container.innerHTML = subs.map(s => `
        <div class="item-card" style="margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between;">
                <h4>${s.title} (by ${s.participant_name})</h4>
                <span class="badge ${s.status || 'under_review'}">${s.status || 'under_review'}</span>
            </div>
            <p><strong>Challenge:</strong> ${s.challenge_title}</p>
            <p><strong>Summary:</strong> ${s.summary}</p>
            <p><strong>Deliverable:</strong> <a href="${s.deliverable_url}" target="_blank">${s.deliverable_type.toUpperCase()} Link</a></p>
            <div style="margin-top: 0.75rem; background: #fff; padding: 0.75rem; border-radius: 4px; border: 1px solid #cbd5e1;">
                <label><strong>Score Submission (0-100):</strong></label>
                <div class="form-row" style="margin-top: 0.25rem;">
                    <input type="number" min="0" max="100" id="score_${s.id}" value="${s.score !== null ? s.score : ''}" placeholder="Score">
                    <select id="status_${s.id}">
                        <option value="under_review" ${s.status === 'under_review' ? 'selected' : ''}>Under Review</option>
                        <option value="finalist" ${s.status === 'finalist' ? 'selected' : ''}>Finalist</option>
                        <option value="winner" ${s.status === 'winner' ? 'selected' : ''}>Winner</option>
                        <option value="rejected" ${s.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                    </select>
                    <button class="btn primary" onclick="submitEvaluation(${s.id})">Save Grade</button>
                </div>
            </div>
        </div>
    `).join("");
}

async function submitEvaluation(submissionId) {
    const score = document.getElementById(`score_${submissionId}`).value;
    const status = document.getElementById(`status_${submissionId}`).value;

    if (score === "") {
        alert("Please provide a numerical score.");
        return;
    }

    const res = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            submission_id: submissionId,
            score: parseInt(score, 10),
            status: status
        })
    });

    if (res.ok) {
        alert("Evaluation recorded and updated on leaderboard!");
        fetchAll();
    }
}

async function loadLeaderboard() {
    const res = await fetch("/api/leaderboard");
    const rows = await res.json();
    const tbody = document.getElementById("leaderboardBody");

    tbody.innerHTML = rows.map((r, index) => `
        <tr>
            <td><strong>#${index + 1}</strong></td>
            <td>${r.project_title}</td>
            <td>${r.participant_name}</td>
            <td>${r.challenge_title}</td>
            <td><a href="${r.deliverable_url}" target="_blank">${r.deliverable_type}</a></td>
            <td><strong>${r.score}/100</strong></td>
            <td><span class="badge ${r.status}">${r.status}</span></td>
        </tr>
    `).join("");
}