const API_BASE = "https://smartquiz-jr-production.up.railway.app";

const topicInput = document.getElementById("topic-input");
const difficultyInput = document.getElementById("difficulty-input");
const ageInput = document.getElementById("age-input");
const generateBtn = document.getElementById("generate-btn");
const statusBox = document.getElementById("status");

function showStatus(msg, success = false) {
    statusBox.textContent = msg;
    statusBox.style.color = success ? "green" : "red";
}

async function generateQuestions() {

    const topic = topicInput.value.trim();
    const difficulty = difficultyInput.value;
    const age = parseInt(ageInput.value);

    if (!topic) {
        showStatus("Please enter a topic.");
        return;
    }

    showStatus("Generating questions... please wait.");

    try {
        const body = {
            topic: topic,
            difficulty: difficulty,
            age: age
        };

        const res = await fetch(`${API_BASE}/ai/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            showStatus("AI generation failed. Try again.");
            return;
        }

        const data = await res.json();

        // Save uuid_id for teacher_start.js
        localStorage.setItem("uuid_id", data.uuid_id);

        showStatus("Questions created successfully!", true);

        // Redirect teacher to start session page
        setTimeout(() => {
            window.location.href = "teacher_start.html";
        }, 1000);

    } catch (err) {
        console.error(err);
        showStatus("Error: Could not generate quiz.");
    }
}

generateBtn.addEventListener("click", generateQuestions);
