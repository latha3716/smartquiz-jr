// teacher_leaderboard.js
// Get room code from URL
const roomcode = new URLSearchParams(window.location.search).get("roomcode");
document.getElementById('room').textContent = roomcode || '-';

// State management
let lastUpdateTime = null;
let previousData = null;
let isFirstLoad = true;

// DOM Elements
const statusEl = document.getElementById('status');
const tableEl = document.getElementById('leader-table');
const tbodyEl = document.querySelector('#leader-table tbody');

// ========================================
// Create Refresh Indicator
// ========================================
function createRefreshIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'refresh-indicator';
  indicator.textContent = 'Updated';
  document.body.appendChild(indicator);
  return indicator;
}

const refreshIndicator = createRefreshIndicator();

// ========================================
// Show Update Notification
// ========================================
function showUpdateNotification() {
  refreshIndicator.classList.add('show');

  setTimeout(() => {
    refreshIndicator.classList.remove('show');
  }, 2000);
}

// ========================================
// Format Time Display
// ========================================
function formatTime(seconds) {
  if (!seconds || seconds === '-') return '-';

  const secs = parseFloat(seconds);
  if (isNaN(secs)) return '-';

  const minutes = Math.floor(secs / 60);
  const remainingSeconds = Math.floor(secs % 60);

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
}

// ========================================
// Format Timestamp
// ========================================
function formatTimestamp(timestamp) {
  if (!timestamp) return '-';

  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    // Show relative time if recent
    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else {
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  } catch (e) {
    return '-';
  }
}

// ========================================
// Create Session Status Badge
// ========================================
function createStatusBadge(status) {
  const badge = document.createElement('span');
  badge.className = `status-badge ${status}`;
  badge.textContent = status;
  return badge;
}

// ========================================
// Detect Row Changes
// ========================================
function getRowKey(entry) {
  return `${entry.user_id || entry.username}-${entry.score}`;
}

function detectChanges(newData) {
  if (!previousData || previousData.length === 0) {
    return { newEntries: newData, changedEntries: [], removedEntries: [] };
  }

  const prevKeys = new Set(previousData.map(getRowKey));
  const newKeys = new Set(newData.map(getRowKey));

  const newEntries = newData.filter(entry => !prevKeys.has(getRowKey(entry)));
  const changedEntries = newData.filter(entry => {
    const oldEntry = previousData.find(old => 
      (old.user_id === entry.user_id || old.username === entry.username)
    );
    return oldEntry && getRowKey(oldEntry) !== getRowKey(entry);
  });

  return { newEntries, changedEntries };
}

// ========================================
// Render Table Row
// ========================================
function createTableRow(entry, rank, isNew = false, isChanged = false) {
  const tr = document.createElement('tr');

  // Add animation class for new/changed rows
  if (isNew) {
    tr.classList.add('new-entry');
    tr.style.animation = 'rowSlideIn 0.4s cubic-bezier(.2,.9,.2,1)';
  } else if (isChanged) {
    tr.classList.add('changed-entry');
    tr.style.animation = 'rowHighlight 0.6s ease';
  }

  // Rank column
  const rankTd = document.createElement('td');
  rankTd.textContent = rank;
  tr.appendChild(rankTd);

  // Student name column
  const nameTd = document.createElement('td');
  nameTd.textContent = entry.username || 'Guest';
  tr.appendChild(nameTd);

  // Score column
  const scoreTd = document.createElement('td');
  scoreTd.textContent = entry.score || 0;
  tr.appendChild(scoreTd);

  // Time column
  const timeTd = document.createElement('td');
  timeTd.textContent = formatTime(entry.time_taken_seconds);
  tr.appendChild(timeTd);

  // Submitted at column
  const submittedTd = document.createElement('td');
  submittedTd.textContent = formatTimestamp(entry.submitted_at);
  submittedTd.setAttribute('title', entry.submitted_at ? 
    new Date(entry.submitted_at).toLocaleString() : '-');
  tr.appendChild(submittedTd);

  return tr;
}

// ========================================
// Load Leaderboard Data
// ========================================
async function loadLeaderboard() {
  try {
    // Fetch session data
    const sessionRes = await fetch(
      `https://smartquiz-jr-production.up.railway.app/quiz/session/room/${roomcode}`
    );

    if (!sessionRes.ok) {
      statusEl.textContent = 'Session not found';
      statusEl.style.borderLeftColor = '#FF5A6C';
      tableEl.hidden = true;
      return;
    }

    const session = await sessionRes.json();

    // Fetch leaderboard data
    const leaderboardRes = await fetch(
      `https://smartquiz-jr-production.up.railway.app/quiz/session/room/${roomcode}/leaderboard`
    );

    if (!leaderboardRes.ok) {
      statusEl.textContent = 'No submissions yet. Waiting for students...';
      statusEl.style.borderLeftColor = '#7ECFF1';
      statusEl.classList.add('updating');
      tableEl.hidden = true;
      return;
    }

    const leaderboardData = await leaderboardRes.json();

    // Detect changes
    const changes = detectChanges(leaderboardData);

    // Update table
    renderLeaderboard(leaderboardData, changes);

    // Update status
    updateStatus(session, leaderboardData.length);

    // Store current data
    previousData = leaderboardData;
    lastUpdateTime = Date.now();

    // Show update notification (skip on first load)
    if (!isFirstLoad && (changes.newEntries.length > 0 || changes.changedEntries.length > 0)) {
      showUpdateNotification();

      // Haptic feedback on updates
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    }

    isFirstLoad = false;

  } catch (err) {
    console.error('Error loading leaderboard:', err);
    statusEl.textContent = 'Error loading leaderboard. Retrying...';
    statusEl.style.borderLeftColor = '#FF5A6C';
    statusEl.classList.remove('updating');
  }
}

// ========================================
// Render Leaderboard Table
// ========================================
function renderLeaderboard(data, changes = {}) {
  // Clear existing rows
  tbodyEl.innerHTML = '';

  // Create rows
  data.forEach((entry, index) => {
    const rank = index + 1;
    const isNew = changes.newEntries && changes.newEntries.some(e => getRowKey(e) === getRowKey(entry));
    const isChanged = changes.changedEntries && changes.changedEntries.some(e => 
      (e.user_id === entry.user_id || e.username === entry.username)
    );

    const row = createTableRow(entry, rank, isNew, isChanged);
    tbodyEl.appendChild(row);
  });

  // Show table
  tableEl.hidden = false;

  // Announce to screen readers
  announceToScreenReader(`Leaderboard updated. ${data.length} student${data.length === 1 ? '' : 's'} submitted.`);
}

// ========================================
// Update Status Display
// ========================================
function updateStatus(session, submissionCount) {
  const badge = createStatusBadge(session.status);

  if (session.status === 'active') {
    statusEl.innerHTML = `Quiz in progress `;
    statusEl.appendChild(badge);
    statusEl.innerHTML += ` — ${submissionCount} submission${submissionCount === 1 ? '' : 's'}`;
    statusEl.style.borderLeftColor = '#4FD1A9';
    statusEl.classList.add('updating');
  } else if (session.status === 'ended') {
    statusEl.innerHTML = `Quiz completed `;
    statusEl.appendChild(badge);
    statusEl.innerHTML += ` — Final results (${submissionCount} total)`;
    statusEl.style.borderLeftColor = '#FFB86B';
    statusEl.classList.remove('updating');
  } else if (session.status === 'waiting') {
    statusEl.innerHTML = `Waiting for quiz to start `;
    statusEl.appendChild(badge);
    statusEl.style.borderLeftColor = '#7ECFF1';
    statusEl.classList.add('updating');
  } else {
    statusEl.textContent = `Session status: ${session.status}`;
    statusEl.style.borderLeftColor = '#7ECFF1';
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
// Add Row Animations to CSS (Dynamic)
// ========================================
const animationStyles = document.createElement('style');
animationStyles.textContent = `
  @keyframes rowSlideIn {
    from {
      opacity: 0;
      transform: translateX(-20px);
      background: rgba(79, 209, 169, 0.15);
    }
    to {
      opacity: 1;
      transform: translateX(0);
      background: transparent;
    }
  }

  @keyframes rowHighlight {
    0%, 100% {
      background: transparent;
    }
    50% {
      background: rgba(255, 184, 107, 0.15);
    }
  }
`;
document.head.appendChild(animationStyles);

// ========================================
// Export Leaderboard (Optional)
// ========================================
function exportToCSV() {
  if (!previousData || previousData.length === 0) {
    alert('No data to export');
    return;
  }

  const headers = ['Rank', 'Student', 'Score', 'Time (s)', 'Submitted At'];
  const rows = previousData.map((entry, index) => [
    index + 1,
    entry.username || 'Guest',
    entry.score || 0,
    entry.time_taken_seconds || '-',
    entry.submitted_at || '-'
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leaderboard-${roomcode}-${Date.now()}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

// Add export button dynamically (optional)
function addExportButton() {
  const exportBtn = document.createElement('button');
  exportBtn.textContent = '📊 Export CSV';
  exportBtn.style.cssText = `
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    padding: 0.8rem 1.5rem;
    background: #4FD1A9;
    color: white;
    border: none;
    border-radius: 26px;
    font-family: 'Poppins', sans-serif;
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(79, 209, 169, 0.3);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  `;

  exportBtn.addEventListener('mouseenter', () => {
    exportBtn.style.transform = 'translateY(-2px) scale(1.02)';
    exportBtn.style.boxShadow = '0 6px 16px rgba(79, 209, 169, 0.4)';
  });

  exportBtn.addEventListener('mouseleave', () => {
    exportBtn.style.transform = 'translateY(0) scale(1)';
    exportBtn.style.boxShadow = '0 4px 12px rgba(79, 209, 169, 0.3)';
  });

  exportBtn.addEventListener('click', exportToCSV);

  document.body.appendChild(exportBtn);
}

// ========================================
// Keyboard Shortcuts
// ========================================
document.addEventListener('keydown', (e) => {
  // Press 'R' to manually refresh
  if (e.key === 'r' || e.key === 'R') {
    e.preventDefault();
    loadLeaderboard();
    showUpdateNotification();
  }

  // Press 'E' to export
  if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
    e.preventDefault();
    exportToCSV();
  }
});

// ========================================
// Initialize
// ========================================
window.addEventListener('load', () => {
  // Initial load
  loadLeaderboard();

  // Auto-refresh every 2 seconds
  setInterval(loadLeaderboard, 2000);

  // Add export button
  setTimeout(addExportButton, 1000);

  // Announce page load
  announceToScreenReader('Teacher leaderboard loaded. Auto-refreshing every 2 seconds.');
});

// ========================================
// Visibility API - Pause updates when tab hidden
// ========================================
let updateInterval;

function startAutoUpdate() {
  updateInterval = setInterval(loadLeaderboard, 2000);
}

function stopAutoUpdate() {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopAutoUpdate();
  } else {
    loadLeaderboard(); // Immediate refresh when coming back
    startAutoUpdate();
  }
});

// Start auto-update
startAutoUpdate();