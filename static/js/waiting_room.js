// waiting_room.js

const API_BASE = "https://smartquiz-jr-production-3ccd.up.railway.app";

// Get URL parameters
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// Retrieve user data
let username = getQueryParam('username') || localStorage.getItem('username') || '';
let roomcode = getQueryParam('roomcode') || localStorage.getItem('roomcode') || '';

// State management
let pollIntervalId = null;
let lastStatus = null;
let connectionErrors = 0;
let isTransitioning = false;

// DOM Elements
const usernameDisplay = document.getElementById('display-username');
const roomDisplay = document.getElementById('display-room');
const leaveBtn = document.querySelector('.leave-btn');

// ========================================
// Initialize Display
// ========================================
function initializeDisplay() {
  // Display username
  if (usernameDisplay) {
    usernameDisplay.innerHTML = `Student:&nbsp;<strong>${username || '-'}</strong>`;
  }

  // Display room code
  if (roomDisplay) {
    roomDisplay.innerHTML = `Room Code:&nbsp;<strong>${roomcode || '-'}</strong>`;
  }

  // Validate data
  if (!username || !roomcode) {
    showError('Missing information. Redirecting to join page...');
    setTimeout(() => {
      window.location.href = 'join.html';
    }, 2000);
  }
}

// ========================================
// Connection Status Indicator
// ========================================
function createConnectionStatus() {
  const status = document.createElement('div');
  status.className = 'connection-status';
  status.innerHTML = 'Checking...';
  document.body.appendChild(status);
  return status;
}

let connectionStatus = null;

function updateConnectionStatus(state, message) {
  if (!connectionStatus) {
    connectionStatus = createConnectionStatus();
  }

  connectionStatus.className = `connection-status ${state} show`;
  connectionStatus.textContent = message;

  // Auto-hide success messages
  if (state === 'success') {
    setTimeout(() => {
      if (connectionStatus) {
        connectionStatus.classList.remove('show');
      }
    }, 2000);
  }
}

// ========================================
// Toast Notification
// ========================================
function showToast(message, type = 'info') {
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');

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
// Status Message Display
// ========================================
function createStatusMessage() {
  const message = document.createElement('p');
  message.className = 'status-message';
  message.textContent = 'Waiting for teacher to start the quiz...';

  const card = document.querySelector('.waiting-card');
  const leaveBtn = document.querySelector('.leave-btn');

  if (card && leaveBtn) {
    card.insertBefore(message, leaveBtn);
  }

  return message;
}

let statusMessage = null;

function updateStatusMessage(text) {
  if (!statusMessage) {
    statusMessage = createStatusMessage();
  }
  statusMessage.textContent = text;
}

// ========================================
// Check Session Status
// ========================================
async function checkSessionStatus() {
  if (!roomcode || isTransitioning) return;

  try {
    updateConnectionStatus('', 'Checking...');

    const response = await fetch(`${API_BASE}/quiz/session/room/${roomcode}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Session not found');
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const session = await response.json();

    // Reset error counter on success
    connectionErrors = 0;
    updateConnectionStatus('success', 'Connected');

    // Check status change
    if (session.status !== lastStatus) {
      lastStatus = session.status;
      handleStatusChange(session.status);
    }

    // If quiz is active, redirect
    if (session.status === 'active') {
      startQuiz();
    } else if (session.status === 'ended') {
      handleQuizEnded();
    } else {
      updateStatusMessage('Waiting for teacher to start the quiz...');
    }

  } catch (error) {
    console.error('Error checking session:', error);
    connectionErrors++;

    updateConnectionStatus('error', 'Connection error');

    if (connectionErrors >= 5) {
      handleConnectionFailure();
    }
  }
}

// ========================================
// Handle Status Changes
// ========================================
function handleStatusChange(status) {
  const messages = {
    waiting: 'Waiting for quiz to start...',
    active: 'Quiz is starting!',
    ended: 'Quiz has ended'
  };

  const message = messages[status] || 'Status updated';

  // Announce to screen readers
  announceToScreenReader(message);

  // Haptic feedback
  if (navigator.vibrate && status === 'active') {
    navigator.vibrate([10, 50, 10, 50, 10]);
  }
}

// ========================================
// Start Quiz Transition
// ========================================
function startQuiz() {
  if (isTransitioning) return;

  isTransitioning = true;

  // Stop polling
  clearPolling();

  // Show transition feedback
  showToast('Quiz is starting! 🎉', 'success');
  updateStatusMessage('Redirecting to quiz...');

  // Haptic feedback
  if (navigator.vibrate) {
    navigator.vibrate([10, 50, 10, 50, 10]);
  }

  // Announce to screen readers
  announceToScreenReader('Quiz is starting. Redirecting to live quiz.');

  // Redirect after brief delay for feedback
  setTimeout(() => {
    window.location.href = `live_quiz.html?roomcode=${encodeURIComponent(roomcode)}&username=${encodeURIComponent(username)}`;
  }, 800);
}

// ========================================
// Handle Quiz Ended
// ========================================
function handleQuizEnded() {
  clearPolling();
  showToast('This quiz has ended', 'info');
  updateStatusMessage('Quiz has ended. Please leave the room.');

  // Update leave button text
  if (leaveBtn) {
    leaveBtn.textContent = 'Return to Join Page';
  }
}

// ========================================
// Handle Connection Failure
// ========================================
function handleConnectionFailure() {
  clearPolling();
  showToast('Unable to connect. Please check your internet.', 'error');
  updateStatusMessage('Connection lost. Click "Leave Room" to try again.');

  announceToScreenReader('Connection lost. Please check your internet connection.');
}

// ========================================
// Leave Room Handler
// ========================================
function handleLeaveRoom() {
  // Confirm if quiz might be starting
  if (lastStatus === 'waiting') {
    const confirmed = confirm('Are you sure you want to leave? The quiz might start soon.');
    if (!confirmed) return;
  }

  // Clear data
  localStorage.removeItem('username');
  localStorage.removeItem('roomcode');
  localStorage.removeItem('participant_id');

  // Stop polling
  clearPolling();

  // Show feedback
  showToast('Leaving room...', 'info');

  // Redirect
  setTimeout(() => {
    window.location.href = 'join.html';
  }, 500);
}

// ========================================
// Polling Management
// ========================================
function startPolling() {
  clearPolling();

  // Initial check
  checkSessionStatus();

  // Poll every 2 seconds
  pollIntervalId = setInterval(checkSessionStatus, 2000);

  console.log('Started polling for session status');
}

function clearPolling() {
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
    console.log('Stopped polling');
  }
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
  // Escape key = Leave room
  if (e.key === 'Escape') {
    handleLeaveRoom();
  }

  // R key = Refresh status
  if (e.key === 'r' || e.key === 'R') {
    e.preventDefault();
    showToast('Refreshing status...', 'info');
    checkSessionStatus();
  }
});

// ========================================
// Visibility API - Pause polling when hidden
// ========================================
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearPolling();
    console.log('Tab hidden - polling paused');
  } else {
    if (!isTransitioning) {
      startPolling();
      console.log('Tab visible - polling resumed');
    }
  }
});

// ========================================
// Show Error Helper
// ========================================
function showError(message) {
  showToast(message, 'error');
  updateStatusMessage(message);
  announceToScreenReader(message);
}

// ========================================
// Initialize on Load
// ========================================
window.addEventListener('load', () => {
  // Fix typo in logo if present
  const logo = document.querySelector('.logo');
  if (logo && logo.textContent.includes('Snart')) {
    logo.textContent = 'SmartQuiz Jr';
  }

  // Initialize display
  initializeDisplay();

  // Create status message
  createStatusMessage();

  // Set up leave button
  if (leaveBtn) {
    leaveBtn.addEventListener('click', handleLeaveRoom);
  }

  // Start polling if we have valid data
  if (username && roomcode) {
    startPolling();

    // Announce page load
    setTimeout(() => {
      announceToScreenReader(`Waiting room for ${username}. Room code ${roomcode}. Waiting for teacher to start the quiz.`);
    }, 1000);
  }

  console.log('Waiting room initialized:', { username, roomcode });
});

// ========================================
// Cleanup on Unload
// ========================================
window.addEventListener('beforeunload', () => {
  clearPolling();
});

// ========================================
// Add Room Code Copy Feature
// ========================================
if (roomDisplay) {
  const roomCodeStrong = roomDisplay.querySelector('strong');

  if (roomCodeStrong && roomcode && roomcode !== '-') {
    roomCodeStrong.style.cursor = 'pointer';
    roomCodeStrong.title = 'Click to copy room code';

    roomCodeStrong.addEventListener('click', (e) => {
      e.stopPropagation();

      navigator.clipboard.writeText(roomcode)
        .then(() => {
          showToast(`Room code copied: ${roomcode}`, 'success');

          // Visual feedback
          roomCodeStrong.style.animation = 'none';
          setTimeout(() => {
            roomCodeStrong.style.animation = 'codePulse 0.3s ease';
          }, 10);
        })
        .catch(err => {
          console.error('Copy failed:', err);
        });
    });
  }
}

// Add code pulse animation
const codePulseStyles = document.createElement('style');
codePulseStyles.textContent = `
  @keyframes codePulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }
`;
document.head.appendChild(codePulseStyles);

// ========================================
// Heartbeat for Long Waits
// ========================================
let waitStartTime = Date.now();
let heartbeatIntervalId = null;

function startHeartbeat() {
  heartbeatIntervalId = setInterval(() => {
    const waitTime = Math.floor((Date.now() - waitStartTime) / 1000);

    // Show encouragement after 2 minutes
    if (waitTime === 120) {
      showToast('Still waiting... The teacher will start soon! 🌟', 'info');
      announceToScreenReader('You have been waiting for 2 minutes. The teacher will start the quiz soon.');
    }

    // Show another message after 5 minutes
    if (waitTime === 300) {
      showToast('Hang tight! Quiz should start any moment now! ⏰', 'info');
    }
  }, 10000); // Check every 10 seconds
}

// Start heartbeat
startHeartbeat();

// Cleanup heartbeat on unload
window.addEventListener('beforeunload', () => {
  if (heartbeatIntervalId) {
    clearInterval(heartbeatIntervalId);
  }
});
