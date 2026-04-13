// live_quiz.js
let questions = [];
let answers = {};
let quizStartTime = null;
const API_BASE = "https://smartquiz-jr-production-3ccd.up.railway.app";

// initQuiz();

// async function loadQuizzes() {
//   try {
//     const response = await axios.get("http://192.168.1.9:8000/quiz/all");
//     const quizzes = response.data;

//     console.log("Quizzes: ", quizzes);
//     return quizzes;

//   } catch (error) {
//     console.error("Error fetching quizzes: ", error);
//   }
// }

async function loadQuizzes() {
  // const session = await axios.get(`http://192.168.1.9:8000/quiz/session/room/${roomcode}`);
  const session = await axios.get(
    `https://smartquiz-jr-production-3ccd.up.railway.app/quiz/session/room/${roomcode}`
  );
  const qIds = session.data.questions;

  // const allQuestions = await axios.get("http://192.168.1.9:8000/quiz/all");
  // const allQuestions = await axios.get(
  //   "https://smartquiz-jr-production-3ccd.up.railway.app/quiz/all"
  // );

  const uuid = session.data.uuid_id;

  const quizzes = await axios.get(
    `${API_BASE}/quiz/by-uuid/${uuid}`
  );

  return quizzes.data;

  // return allQuestions.data.filter(q => qIds.includes(q.id));
  // const quizzes = allQuestions.data;
  // console.log(quizzes)
  // return quizzes;
}


async function initQuiz() {
  questions = await loadQuizzes();   // Wait for data!
  if (!questions || questions.length === 0) {
    console.error("No quizzes found");
    return;
  }

  console.log("Loaded questions:", questions);

  // update totalQuestions AFTER data loads
  totalQuestions = questions.length;
  quizStartTime = Date.now();
  loadQuestion(currentQuestionIndex);
}

let totalQuestions = 0;
let currentQuestionIndex = 0;
let selectedOptionIndex = null;
let timerDuration = 20;
let timerInterval = null;

// elements
const questionNumberEl = document.getElementById('question-number');
const questionTextEl = document.getElementById('question-text');
const optionsContainerEl = document.getElementById('options-container');
const submitBtn = document.getElementById('submit-btn');
const progressText = document.getElementById('progress-text');
const timerEl = document.getElementById('timer');
const roomCodeEl = document.getElementById('room-code');
const studentNameEl = document.getElementById('student-name');

const roomcode = localStorage.getItem('roomcode') || '-';
const username = localStorage.getItem('username') || '-';
roomCodeEl.textContent = `Room: ${roomcode}`;
studentNameEl.textContent = `Student: ${username}`;

function startTimer() {
  let timeLeft = timerDuration;
  timerEl.textContent = timeLeft;
  timerInterval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      handleSubmit();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

function loadQuestion(index) {
  selectedOptionIndex = null;
  submitBtn.disabled = true;
  progressText.textContent = 'Waiting for answer...';

  const q = questions[index];
  questionNumberEl.textContent = `Question ${index + 1} of ${totalQuestions}`;
  questionTextEl.textContent = q.question;

  optionsContainerEl.innerHTML = '';

  const optionValues = Object.values(q.options); // <-- REQUIRED

  optionValues.forEach((optText, i) => {
    const btn = document.createElement('button');
    btn.classList.add('option');
    btn.textContent = optText;
    btn.disabled = false;
    btn.addEventListener('click', () => selectOption(i, optionValues));
    optionsContainerEl.appendChild(btn);
  });

  startTimer();
}


function selectOption(index, optionValues) {
  if (selectedOptionIndex !== null) return;

  selectedOptionIndex = index;

  const q = questions[currentQuestionIndex];

  const optionKeys = Object.keys(q.options);
  const selectedKey = optionKeys[index];
  answers[q.id] = selectedKey;


  Array.from(optionsContainerEl.children).forEach((child, i) => {
    child.disabled = true;
    child.classList.toggle('selected', i === index);
  });

  submitBtn.disabled = false;
  progressText.textContent = 'Option selected. Submit when ready.';
}


function handleSubmit() {
  if (selectedOptionIndex === null) {
    // Auto select no answer and move on after timer ends
    progressText.textContent = 'No answer selected. Moving on...';
  } else {
    progressText.textContent = 'Answer submitted!';
  }

  stopTimer();
  submitBtn.disabled = true;

  // Simulate delay (1s) before next question or finish
  setTimeout(() => {
    currentQuestionIndex++;
    if (currentQuestionIndex < totalQuestions) {
      loadQuestion(currentQuestionIndex);
    } else {
      // window.location.href = '/score.html';
      submitAnswers();
    }
  }, 1000);
}

async function submitAnswers() {
  try {
    const userId = localStorage.getItem("participant_id");   // Change dynamically as needed
    const sessionId = roomcode;  // Change dynamically as needed

    const timeTakenSeconds = (Date.now() - quizStartTime) / 1000;

    // const response = await axios.post(
    //   `http://192.168.1.9:8000/quiz/submit?user_id=${userId}&session_id=${sessionId}&time_taken_seconds=${timeTakenSeconds}`,
    //   { "answers": answers }
    // );
    const response = await axios.post(
      `https://smartquiz-jr-production-3ccd.up.railway.app/quiz/submit?user_id=${userId}&session_id=${sessionId}&time_taken_seconds=${timeTakenSeconds}`,
      { "answers": answers }
    );

    const result = response.data;

    localStorage.setItem("score", result.score);
    localStorage.setItem("total", result.total);
    localStorage.setItem("percentage", result.percentage);
    localStorage.setItem("feedback", result.feedback);
    localStorage.setItem("timeTakenSeconds", timeTakenSeconds);

    // Show "waiting for others" screen (simple UI)
    optionsContainerEl.innerHTML = '';
    questionNumberEl.textContent = 'Submitted — waiting for others...';
    progressText.textContent = 'Waiting for other players to finish the quiz...';

    // Poll the session status until it's ended
    const pollInterval = 2000;
    const poll = setInterval(async () => {
      try {
        // const res = await fetch(`http://192.168.1.9:8000/quiz/session/room/${sessionId}`);
        const res = await fetch(
          `https://smartquiz-jr-production-3ccd.up.railway.app/quiz/session/room/${sessionId}`
        );
        if (!res.ok) {
          // keep waiting; optionally handle 404
          return;
        }
        const session = await res.json();
        if (session.status === 'ended' || session.status === 'active' && session.end_time) {
          clearInterval(poll);
          // All finished — go to score page
          window.location.href = "score.html"; // local static route
        }
      } catch (err) {
        console.error('Error polling session status:', err);
      }
    }, pollInterval);

  } catch (error) {
    console.error("Error submitting quiz answers: ", error);
    alert("Failed to submit answers. Try again.")
  }
}

submitBtn.addEventListener('click', handleSubmit);

// Start first question on load
// loadQuestion(currentQuestionIndex);


initQuiz();
