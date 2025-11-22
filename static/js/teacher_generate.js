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

        // For now static teacher_id = 1
        const body = {
            teacher_id: 1,
            topic: topic,
            age: age,
            difficulty: difficulty,
            questions: 10
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

        // Save uuid_id returned by backend
        localStorage.setItem("uuid_id", data.uuid_id);

        showStatus("Questions created successfully!", true);

        setTimeout(() => {
            window.location.href = "teacher_start.html";
        }, 1000);

    } catch (err) {
        console.error(err);
        showStatus("Error: Could not generate quiz.");
    }
}

generateBtn.addEventListener("click", generateQuestions);
