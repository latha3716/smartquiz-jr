// score.js
// Simple script to dynamically populate score page with results
const score = parseInt(localStorage.getItem("score")) || 0;
const total = parseInt(localStorage.getItem("total")) || 0;
const percentage = parseFloat(localStorage.getItem("percentage")) || 0;
const feedback = localStorage.getItem("feedback") || "Great effort!";
const timeTaken = parseFloat(localStorage.getItem("timeTakenSeconds")) || null; 

// Elements
const scoreDisplay = document.getElementById('score-display');
const summaryEl = document.getElementById('performance-summary');
const correctEl = document.getElementById('correct-count');
const incorrectEl = document.getElementById('incorrect-count');
const skippedEl = document.getElementById('skipped-count');

// Set score text
scoreDisplay.textContent = `Your Score: ${score} / ${total}`;

// Set breakdown counts
correctEl.textContent = score;
incorrectEl.textContent = total - score;
skippedEl.textContent = 0;

// Performance Summary
summaryEl.textContent = `${feedback} (${percentage.toFixed(2)}%)`;

// Performance summary based on score percentage
let message = '';
let emoji = '';

if (percentage >= 85) {
  message = 'Excellent! 🎉';
} else if (percentage >= 60) {
  message = 'Good job! 👍';
} else if (percentage >= 40) {
  message = 'Keep Practicing! 💪';
} else {
  message = 'Better luck next time! 🌟';
}

summaryEl.textContent = message;

// Handle Play Again and Exit
document.getElementById('play-again-btn').onclick = () => {
  localStorage.clear();
  window.location.href = "join.html"; // no leading slash for local file
};

document.getElementById('exit-btn').onclick = () => {
  localStorage.clear();
  window.location.href = "index.html";
};
