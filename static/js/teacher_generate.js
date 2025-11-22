const API_BASE = "https://smartquiz-jr-production.up.railway.app";

// DOM Elements
const topicInput = document.getElementById("topic-input");
const difficultyInput = document.getElementById("difficulty-input");
const ageInput = document.getElementById("age-input");
const questionsInput = document.getElementById("questions-input");  // NEW
const generateBtn = document.getElementById("generate-btn");
const statusBox = document.getElementById("status");

// State management
let isGenerating = false;

// ========================================
// Toast Notification System
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
  }, 4000);
}

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
// Status Display
// ========================================
function showStatus(msg, type = 'loading') {
  statusBox.textContent = msg;
  statusBox.className = type;

  if (type === 'success' || type === 'error') {
    announceToScreenReader(msg);
  }
}

function clearStatus() {
  statusBox.textContent = '';
  statusBox.className = '';
}

// ========================================
// AI Indicator
// ========================================
function createAIIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'ai-indicator';
  indicator.innerHTML = 'AI Generating...';
  document.body.appendChild(indicator);
  return indicator;
}

let aiIndicator = null;

function showAIIndicator() {
  if (!aiIndicator) {
    aiIndicator = createAIIndicator();
  }
  aiIndicator.classList.add('show');
}

function hideAIIndicator() {
  if (aiIndicator) {
    aiIndicator.classList.remove('show');
  }
}

// ========================================
// Input Validation
// ========================================
function validateInputs() {
  const topic = topicInput.value.trim();
  const difficulty = difficultyInput.value;
  const age = parseInt(ageInput.value);
  const numQuestions = parseInt(questionsInput.value);  // NEW

  const errors = [];

  // Topic validation
  if (!topic) {
    errors.push('Please enter a topic');
    topicInput.focus();
  } else if (topic.length < 3) {
    errors.push('Topic must be at least 3 characters');
    topicInput.focus();
  } else if (topic.length > 100) {
    errors.push('Topic must be less than 100 characters');
    topicInput.focus();
  }

  // Age validation
  if (!age || age < 5 || age > 10) {
    errors.push('Please select a valid age (5-10)');
  }

  // Difficulty validation
  if (!['easy', 'medium', 'hard'].includes(difficulty)) {
    errors.push('Please select a valid difficulty level');
  }

  // Questions validation (NEW)
  if (!numQuestions || numQuestions < 1 || numQuestions > 50) {
    errors.push('Number of questions must be between 1 and 50');
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
    data: { topic, difficulty, age, numQuestions }  // NEW: Include numQuestions
  };
}

// ========================================
// Generate Questions (UPDATED)
// ========================================
async function generateQuestions() {
  if (isGenerating) {
    showToast('Already generating questions...', 'warning');
    return;
  }

  // Validate all inputs
  const validation = validateInputs();

  if (!validation.isValid) {
    const errorMsg = validation.errors[0];
    showStatus(errorMsg, 'error');
    showToast(errorMsg, 'error');
    return;
  }

  const { topic, difficulty, age, numQuestions } = validation.data;  // NEW

  isGenerating = true;

  generateBtn.classList.add('loading', 'blooming');
  generateBtn.disabled = true;
  generateBtn.textContent = 'Generating...';

  // Updated status message with actual number
  showStatus(
    `Generating ${numQuestions} ${difficulty} questions for ${age}-year-olds about "${topic}"...`,
    'loading'
  );
  showAIIndicator();

  if (navigator.vibrate) {
    navigator.vibrate([10, 50, 10]);
  }

  announceToScreenReader('AI is generating quiz questions. Please wait.');

  try {
    const teacher_id = parseInt(localStorage.getItem('teacher_id')) || 1;

    // ✅ COMPLETE AIRequest - all fields from teacher input
    const requestBody = {
      teacher_id: teacher_id,
      topic: topic,
      age: age,
      difficulty: difficulty,
      questions: numQuestions  // ✅ Now from teacher input
    };

    console.log('Sending AI request:', requestBody);

    const response = await fetch(`${API_BASE}/ai/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      let errorMessage = 'AI generation failed. Please try again.';

      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch (e) {
        // Use default
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('AI response:', data);

    if (!data.uuid) {
      throw new Error('Invalid response: missing UUID');
    }

    // Save all data to localStorage
    localStorage.setItem('uuid_id', data.uuid);
    localStorage.setItem('topic', topic);
    localStorage.setItem('difficulty', difficulty);
    localStorage.setItem('age', age.toString());
    localStorage.setItem('num_questions', numQuestions.toString());  // NEW

    // Updated success message with actual number
    showStatus('✓ Questions created successfully!', 'success');
    showToast(
      `Successfully generated ${numQuestions} ${difficulty} questions about "${topic}"!`,
      'success'
    );

    if (navigator.vibrate) {
      navigator.vibrate([10, 50, 10, 50, 10]);
    }

    announceToScreenReader('Quiz questions generated successfully. Redirecting to session setup.');

    hideAIIndicator();

    generateBtn.textContent = '✓ Success!';
    generateBtn.style.background = '#29C36A';

    setTimeout(() => {
      window.location.href = 'teacher_start.html';
    }, 1500);

  } catch (error) {
    console.error('Generation error:', error);

    const errorMsg = error.message || 'Failed to generate questions. Please try again.';
    showStatus(`✗ ${errorMsg}`, 'error');
    showToast(errorMsg, 'error');

    hideAIIndicator();

    generateBtn.classList.remove('loading', 'blooming');
    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate Questions';

    announceToScreenReader(`Error: ${errorMsg}`);

    isGenerating = false;
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
// Input Enhancement
// ========================================
function enhanceInputs() {
  topicInput.addEventListener('blur', () => {
    const value = topicInput.value.trim();
    if (value) {
      topicInput.value = value.charAt(0).toUpperCase() + value.slice(1);
    }
  });

  [topicInput, difficultyInput, ageInput, questionsInput].forEach(input => {
    input.addEventListener('input', () => {
      if (statusBox.className === 'error') {
        clearStatus();
      }
    });

    input.addEventListener('change', () => {
      if (statusBox.className === 'error') {
        clearStatus();
      }
    });
  });
}

// ========================================
// Keyboard Shortcuts
// ========================================
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    generateQuestions();
  }

  if (e.key === 'Escape' && !isGenerating) {
    topicInput.value = '';
    difficultyInput.value = 'easy';
    ageInput.value = '7';
    questionsInput.value = '10';  // Reset to default
    clearStatus();
    topicInput.focus();
  }
});

// ========================================
// Form Enhancement
// ========================================
function enhanceFormStructure() {
  const form = document.querySelector('.form');

  const topicLabel = document.createElement('label');
  topicLabel.htmlFor = 'topic-input';
  topicLabel.className = 'field-label';
  topicLabel.innerHTML = 'Quiz Topic <span class="required">*</span>';

  const difficultyLabel = document.createElement('label');
  difficultyLabel.htmlFor = 'difficulty-input';
  difficultyLabel.className = 'field-label';
  difficultyLabel.textContent = 'Difficulty Level';

  const ageLabel = document.createElement('label');
  ageLabel.htmlFor = 'age-input';
  ageLabel.className = 'field-label';
  ageLabel.textContent = 'Student Age';

  // NEW: Questions label
  const questionsLabel = document.createElement('label');
  questionsLabel.htmlFor = 'questions-input';
  questionsLabel.className = 'field-label';
  questionsLabel.textContent = 'Number of Questions';

  const topicGroup = document.createElement('div');
  topicGroup.className = 'field-group';
  topicGroup.appendChild(topicLabel);
  topicGroup.appendChild(topicInput);

  const difficultyGroup = document.createElement('div');
  difficultyGroup.className = 'field-group';
  difficultyGroup.appendChild(difficultyLabel);
  difficultyGroup.appendChild(difficultyInput);

  const ageGroup = document.createElement('div');
  ageGroup.className = 'field-group';
  ageGroup.appendChild(ageLabel);
  ageGroup.appendChild(ageInput);

  // NEW: Questions group
  const questionsGroup = document.createElement('div');
  questionsGroup.className = 'field-group';
  questionsGroup.appendChild(questionsLabel);
  questionsGroup.appendChild(questionsInput);

  form.innerHTML = '';
  form.appendChild(topicGroup);
  form.appendChild(difficultyGroup);
  form.appendChild(ageGroup);
  form.appendChild(questionsGroup);  // NEW
  form.appendChild(generateBtn);

  // Updated helper text
  const helperText = document.createElement('p');
  helperText.className = 'helper-text';
  helperText.innerHTML = 'AI will generate questions based on your inputs. Generation typically takes <strong>10-30 seconds</strong>.';
  form.appendChild(helperText);
}

// ========================================
// Example Topics
// ========================================
function addExampleTopics() {
  const examples = [
    'Solar System',
    'Addition & Subtraction',
    'Animals & Habitats',
    'World Geography',
    'Famous Scientists'
  ];

  const exampleContainer = document.createElement('div');
  exampleContainer.style.cssText = `
    margin-top: 1rem;
    text-align: center;
    font-size: 0.85rem;
    color: #6B7280;
  `;

  const exampleLabel = document.createElement('p');
  exampleLabel.textContent = 'Example topics:';
  exampleLabel.style.marginBottom = '0.5rem';
  exampleContainer.appendChild(exampleLabel);

  const exampleButtons = document.createElement('div');
  exampleButtons.style.cssText = `
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: center;
  `;

  examples.forEach(topic => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = topic;
    btn.style.cssText = `
      padding: 0.4rem 0.8rem;
      background: rgba(126, 207, 241, 0.1);
      color: #7ECFF1;
      border: 1px solid rgba(126, 207, 241, 0.3);
      border-radius: 12px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s ease;
    `;

    btn.addEventListener('click', () => {
      topicInput.value = topic;
      topicInput.focus();
      showToast(`Topic set to "${topic}"`, 'info');
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#7ECFF1';
      btn.style.color = 'white';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(126, 207, 241, 0.1)';
      btn.style.color = '#7ECFF1';
    });

    exampleButtons.appendChild(btn);
  });

  exampleContainer.appendChild(exampleButtons);

  const form = document.querySelector('.form');
  form.appendChild(exampleContainer);
}

// ========================================
// Initialize
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  enhanceFormStructure();
  addExampleTopics();

  generateBtn.addEventListener('click', generateQuestions);

  enhanceInputs();

  setTimeout(() => topicInput.focus(), 300);

  setTimeout(() => {
    announceToScreenReader('AI Quiz Generator loaded. All fields are required. Press Control Enter to submit.');
  }, 1000);

  console.log('AI Quiz Generator initialized (all fields teacher-provided)');
});

// ========================================
// Warn Before Leaving
// ========================================
window.addEventListener('beforeunload', (e) => {
  if (isGenerating) {
    e.preventDefault();
    e.returnValue = 'Quiz generation in progress. Are you sure you want to leave?';
    return e.returnValue;
  }
});

// ========================================
// Prefetch
// ========================================
const prefetchLink = document.createElement('link');
prefetchLink.rel = 'prefetch';
prefetchLink.href = 'teacher_start.html';
document.head.appendChild(prefetchLink);