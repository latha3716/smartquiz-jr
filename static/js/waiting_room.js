// waiting_room.js
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param)
}

// try to get data from the URL, fallback to localstorate
let username = getQueryParam('username') || localStorage.getItem('username') || '';
let roomcode = getQueryParam('roomcode') || localStorage.getItem('roomcode') || '';

// fill fields (if data is missing, show "-")
document.getElementById('display-username').innerHTML = 'Student:&nbsp;<strong>' + (username? username: '-') + '</strong>';
document.getElementById('display-room').innerHTML = 'Room Code:&nbsp;<strong>' +
  (roomcode ? roomcode : '-') + '</strong>';


// optionally set up leave room logic
document.querySelector('.leave-btn').onclick = function() {
    // clear data
    localStorage.removeItem('username')
    localStorage.removeItem('roomcode')
    window.location.href = 'join.html'
}

async function checkSessionStatus() {
  if (!roomcode) return;

  try {
    const response = await fetch(`http://localhost:8000/quiz/session/room/${roomcode}`);
    const data = await response.json();

    if (data.status === "active") {
      window.location.href = `live_quiz.html?roomcode=${roomcode}&username=${username}`;
    }
  } catch (error) {
    console.error("Failed to check session:", error);
  }
}
setInterval(checkSessionStatus, 2000);


async function checkQuizStatus() {
    const res = await fetch(`http://localhost:8000/quiz/session/room/${roomcode}`);
    const session = await res.json();

    if (session.status === "active") {
        window.location.href = `live_quiz.html?roomcode=${roomcode}&username=${username}`;
    }
}

setInterval(checkQuizStatus, 2000);
checkQuizStatus();


