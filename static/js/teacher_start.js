// teacher_start.js
const API_BASE = "http://192.168.1.9:8000"; // change if needed

let roomcode = localStorage.getItem("roomcode");
let session_id = localStorage.getItem("session_id");
let pollIntervalId = null;

function setRoomDisplay(code) {
    document.getElementById("room").textContent = code || "";
}

function clearPolling() {
    if (pollIntervalId) {
        clearInterval(pollIntervalId);
        pollIntervalId = null;
    }
}

// ALWAYS create a new session when called (your requirement)
async function createNewSession() {
    try {
        clearPolling(); // stop any polling
        setRoomDisplay(""); // clear UI

        const body = {
            template_id: 0,
            questions: [0],
            status: "waiting",
            config: {}
        };

        const res = await fetch(`${API_BASE}/quiz/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!res.ok) throw new Error("Create session failed: " + res.status);

        const data = await res.json();

        session_id = data.id;
        roomcode = data.room_code;

        localStorage.setItem("session_id", session_id);
        localStorage.setItem("roomcode", roomcode);

        setRoomDisplay(roomcode);
        startPollingParticipants();

        alert(`New session created! Room: ${roomcode}`);
        console.log("New session:", session_id, roomcode);

    } catch (err) {
        console.error("Error creating session:", err);
        alert("Failed to create new session.");
    }
}

async function loadParticipants() {
    if (!roomcode) return;

    try {
        const res = await fetch(`${API_BASE}/quiz/participants/${roomcode}`);
        if (!res.ok) return;

        const students = await res.json();
        const ul = document.getElementById("students-list");
        ul.innerHTML = "";

        (students || []).forEach(s => {
            const li = document.createElement("li");
            li.textContent = s.username || "Unnamed";
            ul.appendChild(li);
        });
    } catch (error) {
        console.error("Failed to load participants:", error);
    }
}

function startPollingParticipants() {
    clearPolling();
    loadParticipants();
    pollIntervalId = setInterval(loadParticipants, 2000);
}

async function startQuiz() {
    if (!roomcode) return alert("No session created!");

    try {
        const res = await fetch(`${API_BASE}/quiz/session/${roomcode}/start`, {
            method: "PATCH"
        });
        if (!res.ok) throw new Error("Start failed");

        alert("Quiz Started!");
        console.log("Quiz started:", roomcode);
    } catch (error) {
        console.error("Error starting quiz:", error);
        alert("Failed to start quiz!");
    }
}

// Redirect to leaderboard
function goToLeaderboard() {
    if (!roomcode) return alert("No session created!");
    window.open(`teacher_leaderboard.html?roomcode=${encodeURIComponent(roomcode)}`, "_blank");
}

// Manual room change still supported
function setRoom() {
    const value = document.getElementById("room-input").value.trim();
    if (!value) return;
    roomcode = value;
    session_id = null;
    localStorage.setItem("roomcode", roomcode);
    localStorage.removeItem("session_id");
    setRoomDisplay(roomcode);
    startPollingParticipants();
}

document.addEventListener("DOMContentLoaded", () => {
    if (roomcode) {
        setRoomDisplay(roomcode);
        startPollingParticipants();
    }

    document.getElementById("create-session-btn")
        .addEventListener("click", createNewSession);

    document.getElementById("start-btn")
        .addEventListener("click", startQuiz);

    document.getElementById("leaderboard-btn")
        .addEventListener("click", goToLeaderboard);
});
