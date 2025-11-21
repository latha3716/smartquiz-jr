// teacher_start.js
const API_BASE = "https://smartquiz-jr-production.up.railway.app";

// State management
let roomcode = localStorage.getItem("roomcode");
let session_id = localStorage.getItem("session_id");
let pollIntervalId = null;
let previousStudentIds = new Set();

// DOM Elements
const roomDisplay = document.getElementById("room");
const studentsList = document.getElementById("students-list");
const studentsHeading = document.querySelector("h3");
const createBtn = document.getElementById("create-session-btn");
const startBtn = document.getElementById("start-btn");
const leaderboardBtn = document.getElementById("leaderboard-btn");
const roomInput = document.getElementById("room-input");

// ========================================
// Toast Notification System
// ========================================
function showToast(message, type = 'info') {
  // Remove existing toast
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');

  // Add styles
  const colors = {
    success: '#4FD1A9',
    error: '#FF5A6C',
    info: '#7ECFF1',
    warning: '#FF9A52'
  };

  toast.style.cssText = `
    position: fixed;
    top: 2rem;
    left: 50%;
    transform: translateX(-50%);
    padding: 1rem 1.5rem;
    background: ${colors[type] || colors.info};
    color: white;
    font-family: 'Poppins', sans-serif;
    font-size: 0.95rem;
    font-weight: 600;
    border-radius: 18px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    animation: toastSlideIn 0.3s cubic-bezier(.2,.9,.2,1);
  `;

  document.body.appendChild(toast);

  // Auto-remove
  setTimeout(() => {
    toast.style.animation = 'toastSlideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Add toast animations
const toastStyles = document.createElement('style');
toastStyles.textContent = `
  @keyframes toastSlideIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  @keyframes toastSlideOut {
    from {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    to {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
    }
  }
`;
document.head.appendChild(toastStyles);

// ========================================
// Status Indicator
// ========================================
function createStatusIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'status-indicator';
  indicator.innerHTML = 'Session Active';
  document.body.appendChild(indicator);
  return indicator;
}

let statusIndicator = null;

function updateStatusIndicator(status) {
  if (!statusIndicator) {
    statusIndicator = createStatusIndicator();
  }

  const statusTexts = {
    waiting: 'Waiting',
    active: 'Quiz Active',
    ended: 'Quiz Ended'
  };

  statusIndicator.textContent = statusTexts[status] || 'Session Active';
  statusIndicator.style.background = status === 'active' ? '#4FD1A9' : '#7ECFF1';
}

// ========================================
// Room Display
// ========================================
function setRoomDisplay(code) {
  if (code) {
    roomDisplay.textContent = code;
    roomDisplay.style.animation = 'codeAppear 0.5s cubic-bezier(.2,.9,.2,1)';
  } else {
    roomDisplay.textContent = '-';
  }
}

// Add code appear animation
const codeStyles = document.createElement('style');
codeStyles.textContent = `
  @keyframes codeAppear {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
`;
document.head.appendChild(codeStyles);

// ========================================
// Polling Management
// ========================================
function clearPolling() {
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
  }
}

function startPollingParticipants() {
  clearPolling();
  loadParticipants();
  pollIntervalId = setInterval(loadParticipants, 2000);
}

// ========================================
// Create New Session
// ========================================
async function createNewSession() {
  try {
    // Show loading state
    createBtn.disabled = true;
    createBtn.textContent = 'Creating...';

    clearPolling();
    setRoomDisplay('');

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
    updateStatusIndicator('waiting');

    // Success feedback
    showToast(`Session created! Room code: ${roomcode}`, 'success');

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([10, 50, 10]);
    }

    // Announce to screen readers
    announceToScreenReader(`New session created. Room code is ${roomcode}`);

    console.log("New session:", session_id, roomcode);

  } catch (err) {
    console.error("Error creating session:", err);
    showToast("Failed to create new session. Please try again.", 'error');
  } finally {
    createBtn.disabled = false;
    createBtn.textContent = 'Create New Session';
  }
}

// ========================================
// Load Participants (with change detection)
// ========================================
async function loadParticipants() {
  if (!roomcode) return;

  try {
    const res = await fetch(`${API_BASE}/quiz/participants/${roomcode}`);
    if (!res.ok) return;

    const students = await res.json();
    const currentStudentIds = new Set();

    // Clear list
    studentsList.innerHTML = '';

    if (students && students.length > 0) {
      students.forEach((student, index) => {
        const studentId = student.id || student.username;
        currentStudentIds.add(studentId);

        const li = document.createElement('li');
        li.textContent = student.username || 'Unnamed';
        li.style.animationDelay = `${index * 50}ms`;

        // Highlight new students
        if (!previousStudentIds.has(studentId)) {
          li.classList.add('new-student');

          // Haptic feedback for new student
          if (navigator.vibrate && previousStudentIds.size > 0) {
            navigator.vibrate(10);
          }

          // Announce new student
          if (previousStudentIds.size > 0) {
            announceToScreenReader(`${student.username} joined the room`);
          }
        }

        studentsList.appendChild(li);
      });

      // Update count badge
      updateStudentCount(students.length);
    } else {
      updateStudentCount(0);
    }

    // Update previous state
    previousStudentIds = currentStudentIds;

  } catch (error) {
    console.error("Failed to load participants:", error);
  }
}

// ========================================
// Update Student Count Badge
// ========================================
function updateStudentCount(count) {
  studentsHeading.setAttribute('data-count', count);
  studentsHeading.textContent = `Students Joined: ${count}`;
}

// ========================================
// Start Quiz (with Lumen Bloom)
// ========================================
async function startQuiz() {
  if (!roomcode) {
    showToast("No session created! Please create a session first.", 'error');
    return;
  }

  // Check if students have joined
  const studentCount = previousStudentIds.size;
  if (studentCount === 0) {
    const confirmed = confirm("No students have joined yet. Start anyway?");
    if (!confirmed) return;
  }

  try {
    // Trigger Lumen Bloom
    startBtn.classList.add('blooming');
    startBtn.disabled = true;
    startBtn.textContent = 'Starting...';

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([10, 50, 10]);
    }

    const res = await fetch(`${API_BASE}/quiz/session/${roomcode}/start`, {
      method: "PATCH"
    });

    if (!res.ok) throw new Error("Start failed");

    updateStatusIndicator('active');
    showToast(`Quiz started! ${studentCount} student${studentCount === 1 ? '' : 's'} participating.`, 'success');

    // Announce to screen readers
    announceToScreenReader(`Quiz started with ${studentCount} students`);

    console.log("Quiz started:", roomcode);

    // Enable leaderboard button
    leaderboardBtn.style.animation = 'buttonPulse 0.6s ease';

  } catch (error) {
    console.error("Error starting quiz:", error);
    showToast("Failed to start quiz. Please try again.", 'error');
  } finally {
    startBtn.disabled = false;
    startBtn.textContent = 'Start Quiz';

    // Remove bloom class
    setTimeout(() => {
      startBtn.classList.remove('blooming');
    }, 350);
  }
}

// Add button pulse animation
const pulseStyles = document.createElement('style');
pulseStyles.textContent = `
  @keyframes buttonPulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }
`;
document.head.appendChild(pulseStyles);

// ========================================
// Go to Leaderboard
// ========================================
function goToLeaderboard() {
  if (!roomcode) {
    showToast("No session created! Please create a session first.", 'error');
    return;
  }

  window.open(
    `teacher_leaderboard.html?roomcode=${encodeURIComponent(roomcode)}`,
    "_blank"
  );

  showToast("Leaderboard opened in new tab", 'info');
}

// ========================================
// Manual Room Change
// ========================================
function setRoom() {
  const value = roomInput.value.trim().toUpperCase();

  if (!value) {
    showToast("Please enter a room code", 'warning');
    return;
  }

  if (value.length < 4) {
    showToast("Room code must be at least 4 characters", 'warning');
    return;
  }

  roomcode = value;
  session_id = null;

  localStorage.setItem("roomcode", roomcode);
  localStorage.removeItem("session_id");

  setRoomDisplay(roomcode);
  previousStudentIds.clear();
  startPollingParticipants();

  showToast(`Switched to room: ${roomcode}`, 'info');

  // Clear input
  roomInput.value = '';
}

// ========================================
// Accessibility Helper
// ========================================
function announceToScreenReader(message) {
  const announcement = document.createElement('div');
  announcement.className = 'sr-only';
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => announcement.remove(), 3000);
}

// ========================================
// Keyboard Shortcuts
// ========================================
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + N = New session
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    createNewSession();
  }

  // Ctrl/Cmd + S = Start quiz
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    startQuiz();
  }

  // Ctrl/Cmd + L = Open leaderboard
  if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
    e.preventDefault();
    goToLeaderboard();
  }

  // Enter in room input = Go to room
  if (e.target === roomInput && e.key === 'Enter') {
    e.preventDefault();
    setRoom();
  }
});

// ========================================
// Auto-capitalize room input
// ========================================
roomInput.addEventListener('input', (e) => {
  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});

// ========================================
// Initialize on Load
// ========================================
document.addEventListener("DOMContentLoaded", () => {
  // Restore session
  if (roomcode) {
    setRoomDisplay(roomcode);
    startPollingParticipants();
    updateStatusIndicator('waiting');
  }

  // Update student count badge
  updateStudentCount(0);

  // Event listeners
  createBtn.addEventListener("click", createNewSession);
  startBtn.addEventListener("click", startQuiz);
  leaderboardBtn.addEventListener("click", goToLeaderboard);

  // Add global setRoom function for inline onclick
  window.setRoom = setRoom;

  // Announce page load
  setTimeout(() => {
    announceToScreenReader('Teacher control panel loaded. Press Control N to create a new session.');
  }, 1000);

  console.log("Teacher control panel initialized");
});

// ========================================
// Visibility API - Pause polling when hidden
// ========================================
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearPolling();
  } else {
    if (roomcode) {
      startPollingParticipants();
    }
  }
});

// ========================================
// Warn before closing if session active
// ========================================
window.addEventListener('beforeunload', (e) => {
  if (roomcode && previousStudentIds.size > 0) {
    e.preventDefault();
    e.returnValue = 'Students are connected to this session. Are you sure you want to leave?';
    return e.returnValue;
  }
});

// ========================================
// Auto-focus room input on Ctrl+K
// ========================================
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    roomInput.focus();
  }
});

// ========================================
// Copy room code to clipboard
// ========================================
roomDisplay.addEventListener('click', () => {
  if (roomcode && roomcode !== '-') {
    navigator.clipboard.writeText(roomcode)
      .then(() => {
        showToast(`Room code copied: ${roomcode}`, 'success');

        // Visual feedback
        roomDisplay.style.animation = 'none';
        setTimeout(() => {
          roomDisplay.style.animation = 'codePulse 0.3s ease';
        }, 10);
      })
      .catch(err => {
        console.error('Copy failed:', err);
      });
  }
});

// Add code pulse animation
const codePulseStyles = document.createElement('style');
codePulseStyles.textContent = `
  @keyframes codePulse {
    0%, 100% {
      transform: scale(1);
      filter: drop-shadow(0 2px 8px rgba(255, 184, 107, 0.3));
    }
    50% {
      transform: scale(1.1);
      filter: drop-shadow(0 2px 14px rgba(255, 184, 107, 0.6));
    }
  }
`;
document.head.appendChild(codePulseStyles);

// Make room display look clickable
roomDisplay.style.cursor = 'pointer';
roomDisplay.title = 'Click to copy room code';
// Click on room code display
roomDisplay.addEventListener('click', () => {
  navigator.clipboard.writeText(roomcode)
    .then(() => {
      showToast(`Room code copied: ${roomcode}`, 'success');
      // Visual pulse feedback
    });
});
// Compares Sets to detect new joiners
const newStudents = currentIds.filter(id => !previousIds.has(id));

newStudents.forEach(student => {
  li.classList.add('new-student'); // Verde pulse animation
  announceToScreenReader(`${student.name} joined`);
});
// Saves bandwidth when tab hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearInterval(pollIntervalId); // Stop polling
  } else {
    startPollingParticipants(); // Resume immediately
  }
});
