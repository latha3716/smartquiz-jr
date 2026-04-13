// score.js
const score = parseInt(localStorage.getItem("score")) || 0;
const total = parseInt(localStorage.getItem("total")) || 0;
const percentage = parseFloat(localStorage.getItem("percentage")) || 0;
const feedback = localStorage.getItem("feedback") || "Great effort!";
const timeTaken = parseFloat(localStorage.getItem("timeTakenSeconds")) || null;

// DOM Elements
const scoreDisplay = document.getElementById('score-display');
const summaryEl = document.getElementById('performance-summary');
const correctEl = document.getElementById('correct-count');
const incorrectEl = document.getElementById('incorrect-count');
const skippedEl = document.getElementById('skipped-count');
const resultCard = document.querySelector('.result-card');

// ========================================
// Performance Classification & Messaging
// ========================================
function getPerformanceData(percentage) {
  if (percentage >= 85) {
    return {
      class: 'excellent',
      message: 'Excellent! 🎉',
      emoji: '🌟',
      color: '#29C36A'
    };
  } else if (percentage >= 60) {
    return {
      class: 'good',
      message: 'Good job! 👍',
      emoji: '⭐',
      color: '#FFB86B'
    };
  } else if (percentage >= 40) {
    return {
      class: 'practice',
      message: 'Keep Practicing! 💪',
      emoji: '📚',
      color: '#FF9A52'
    };
  } else {
    return {
      class: 'practice',
      message: 'Better luck next time! 🌟',
      emoji: '🎯',
      color: '#7ECFF1'
    };
  }
}

// ========================================
// Populate Score Data
// ========================================
function populateScoreData() {
  const performance = getPerformanceData(percentage);

  // Add performance class to card
  resultCard.classList.add(performance.class);

  // Animate score display with count-up effect
  animateCountUp(scoreDisplay, score, total, 1000);

  // Set performance message
  summaryEl.textContent = performance.message;
  summaryEl.style.color = performance.color;

  // Set breakdown counts with animation
  setTimeout(() => {
    animateCountUp(correctEl, score, score, 600);
    animateCountUp(incorrectEl, total - score, total - score, 600);
    animateCountUp(skippedEl, 0, 0, 600);
  }, 400);

  // Add screen reader announcement
  announceToScreenReader(`Your score is ${score} out of ${total}. ${performance.message}`);
}

// ========================================
// Count-up Animation
// ========================================
function animateCountUp(element, targetValue, totalValue, duration) {
  const startTime = performance.now();
  const startValue = 0;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function (ease-out)
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const currentValue = Math.floor(startValue + (targetValue - startValue) * easeProgress);

    if (element.id === 'score-display') {
      element.textContent = `Your Score: ${currentValue} / ${totalValue}`;
    } else {
      element.textContent = currentValue;
    }

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      // Final value
      if (element.id === 'score-display') {
        element.textContent = `Your Score: ${targetValue} / ${totalValue}`;
      } else {
        element.textContent = targetValue;
      }

      // Trigger celebration if excellent score
      if (element.id === 'score-display' && percentage >= 85) {
        triggerConfetti();
      }
    }
  }

  requestAnimationFrame(update);
}

// ========================================
// Confetti Effect (Lumen Celebration)
// ========================================
function triggerConfetti() {
  const colors = ['#FFB86B', '#4FD1A9', '#7ECFF1', '#29C36A'];
  const particleCount = 30;

  for (let i = 0; i < particleCount; i++) {
    setTimeout(() => {
      createConfettiParticle(colors[Math.floor(Math.random() * colors.length)]);
    }, i * 30);
  }
}

function createConfettiParticle(color) {
  const particle = document.createElement('div');
  particle.style.cssText = `
    position: fixed;
    width: 10px;
    height: 10px;
    background: ${color};
    border-radius: 50%;
    pointer-events: none;
    z-index: 1000;
    left: ${Math.random() * 100}vw;
    top: -20px;
    opacity: 1;
  `;

  document.body.appendChild(particle);

  // Animate particle
  const duration = 2000 + Math.random() * 1000;
  const xMovement = (Math.random() - 0.5) * 200;

  particle.animate([
    { 
      transform: 'translateY(0) translateX(0) rotate(0deg)',
      opacity: 1
    },
    { 
      transform: `translateY(100vh) translateX(${xMovement}px) rotate(${Math.random() * 720}deg)`,
      opacity: 0
    }
  ], {
    duration: duration,
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
  }).onfinish = () => {
    particle.remove();
  };
}

// ========================================
// Button Lumen Bloom Effects
// ========================================
function addLumenBloomToButtons() {
  const buttons = document.querySelectorAll('.action-buttons button');

  buttons.forEach(button => {
    button.addEventListener('click', function(e) {
      // Trigger bloom animation
      this.classList.add('blooming');

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }

      // Remove class after animation
      setTimeout(() => {
        this.classList.remove('blooming');
      }, 350);
    });
  });
}

// ========================================
// Play Again Handler
// ========================================
document.getElementById('play-again-btn').addEventListener('click', () => {
  // Clear only quiz-related data, keep user info
  const username = localStorage.getItem('username');
  const roomcode = localStorage.getItem('roomcode');

  localStorage.clear();

  // Restore user session data
  if (username) localStorage.setItem('username', username);
  if (roomcode) localStorage.setItem('roomcode', roomcode);

  // Navigate to join page
  window.location.href = "join.html";
});

// ========================================
// Exit Handler
// ========================================
document.getElementById('exit-btn').addEventListener('click', () => {
  // Clear all data
  localStorage.clear();
  sessionStorage.clear();

  // Navigate to home
  window.location.href = "index.html";
});

// ========================================
// Leaderboard Population
// ========================================
async function populateLeaderboard() {
  const room = localStorage.getItem('roomcode');
  const username = localStorage.getItem('username');

  if (!room) return;

  try {
    const response = await fetch(
      `https://smartquiz-jr-production-3ccd.up.railway.app/quiz/session/${room}/leaderboard`
    );

    if (!response.ok) {
      console.log('Leaderboard not available yet');
      return;
    }

    const leaderboard = await response.json();

    if (leaderboard && leaderboard.length > 0) {
      displayLeaderboard(leaderboard);
    }
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
  }
}

function displayLeaderboard(data) {
  const leaderboardSection = document.getElementById('leaderboard');
  const leaderboardList = document.getElementById('leaderboard-list');
  const participantId = localStorage.getItem('participant_id');

  if (!leaderboardSection || !leaderboardList) return;

  // Clear existing entries
  leaderboardList.innerHTML = '';

  // Populate leaderboard
  data.forEach((entry, index) => {
    const li = document.createElement('li');
    li.textContent = `${index + 1}. ${entry.username || 'Anonymous'} - ${entry.score || 0} points`;

    // Highlight current user
    if (entry.user_id === participantId) {
      li.style.fontWeight = '700';
      li.style.color = '#FFB86B';
      li.innerHTML = `${index + 1}. ${entry.username || 'Anonymous'} - ${entry.score || 0} points <strong>(You)</strong>`;
    }

    leaderboardList.appendChild(li);
  });

  // Show leaderboard
  leaderboardSection.removeAttribute('hidden');
}

// ========================================
// Share Result (Optional Feature)
// ========================================
function shareResult() {
  const shareData = {
    title: 'SmartQuiz Jr - My Score',
    text: `I scored ${score}/${total} (${percentage.toFixed(0)}%) on SmartQuiz Jr! 🎉`,
    url: window.location.href
  };

  if (navigator.share) {
    navigator.share(shareData)
      .then(() => console.log('Shared successfully'))
      .catch(err => console.log('Share failed:', err));
  } else {
    // Fallback: copy to clipboard
    const textToCopy = `${shareData.text}\n${shareData.url}`;
    navigator.clipboard.writeText(textToCopy)
      .then(() => alert('Result copied to clipboard!'))
      .catch(err => console.error('Copy failed:', err));
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

  // Remove after announcement
  setTimeout(() => announcement.remove(), 3000);
}

// ========================================
// Keyboard Shortcuts
// ========================================
document.addEventListener('keydown', (e) => {
  // Press 'P' to play again
  if (e.key === 'p' || e.key === 'P') {
    document.getElementById('play-again-btn').click();
  }

  // Press 'E' or 'Escape' to exit
  if (e.key === 'e' || e.key === 'E' || e.key === 'Escape') {
    document.getElementById('exit-btn').click();
  }
});

// ========================================
// Performance Insights (Optional)
// ========================================
function displayPerformanceInsights() {
  if (!timeTaken) return;

  const minutes = Math.floor(timeTaken / 60);
  const seconds = Math.floor(timeTaken % 60);
  const timeString = minutes > 0 
    ? `${minutes}m ${seconds}s` 
    : `${seconds}s`;

  // Add time info to breakdown
  const breakdownEl = document.getElementById('detailed-breakdown');
  const timeDiv = document.createElement('div');
  timeDiv.innerHTML = `<strong>Time:</strong> <span>${timeString}</span>`;
  breakdownEl.appendChild(timeDiv);
}

// ========================================
// Initialize on Page Load
// ========================================
window.addEventListener('load', () => {
  // Populate score data with animations
  populateScoreData();

  // Add Lumen bloom to buttons
  addLumenBloomToButtons();

  // Display performance insights
  displayPerformanceInsights();

  // Populate leaderboard (async)
  populateLeaderboard();

  // Announce page load to screen readers
  setTimeout(() => {
    announceToScreenReader('Score page loaded. Your results are displayed.');
  }, 1000);
});

// ========================================
// Prefetch next potential pages
// ========================================
const prefetchLinks = ['join.html', 'index.html'];
prefetchLinks.forEach(href => {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  document.head.appendChild(link);
});
