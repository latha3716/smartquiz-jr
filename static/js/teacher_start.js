// teacher_start.js
const roomcode = new URLSearchParams(window.location.search).get("roomcode");
document.getElementById("room").textContent = roomcode;

if (!roomcode) {
    alert("Room code missing! Open link as: teacher_start.html?roomcode=ROOM123");
}


// Load participants every 2 seconds
async function loadParticipants() {
    if (!roomcode) return;

    try {
        const res = await fetch(`http://localhost:8000/quiz/participants/${roomcode}`);
        const students = await res.json();

        const ul = document.getElementById("students-list");
        ul.innerHTML = "";

        students.forEach(s => {
            const li = document.createElement("li");
            li.textContent = s.username;
            ul.appendChild(li);
        });

    } catch (error) {
        console.error("Failed to load participants:", error);
    }
}

setInterval(loadParticipants, 2000);
loadParticipants(); // load immediately first time

// Start quiz
document.getElementById("start-btn").onclick = async () => {
    try {
        await fetch(`http://localhost:8000/quiz/session/${roomcode}/start`, {
            method: "PATCH"
        });
        alert("Quiz Started!");
    } catch (error) {
        alert("Error starting the quiz!");
        console.error(error);
    }
};

function setRoom() {
    const value = document.getElementById("room-input").value.trim();
    if (value) {
        window.location.href = `teacher_start.html?roomcode=${value}`;
    }
}
