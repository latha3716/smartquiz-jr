// teacher_leaderboard.js
const roomcode = new URLSearchParams(window.location.search).get("roomcode");
document.getElementById('room').textContent = roomcode || '-';

async function loadLeaderboard() {
  try {
    const sessionRes = await fetch(`http://192.168.1.9:8000/quiz/session/room/${roomcode}`);
    if (!sessionRes.ok) {
      document.getElementById('status').textContent = 'Session not found.';
      return;
    }
    const session = await sessionRes.json();

    const res = await fetch(`http://192.168.1.9:8000/quiz/session/room/${roomcode}/leaderboard`);
    if (!res.ok) {
      document.getElementById('status').textContent = 'No submissions yet.';
      return;
    }
    const rows = await res.json(); // list of LeaderboardEntry

    const tbody = document.querySelector('#leader-table tbody');
    tbody.innerHTML = '';
    rows.forEach((r, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i + 1}</td>
                          <td>${r.username ?? 'Guest'}</td>
                          <td>${r.score}</td>
                          <td>${r.time_taken_seconds ?? '-'}</td>
                          <td>${r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '-'}</td>`;
      tbody.appendChild(tr);
    });

    document.getElementById('leader-table').hidden = false;
    document.getElementById('status').textContent = `Session status: ${session.status}`;

  } catch (err) {
    console.error(err);
    document.getElementById('status').textContent = 'Error loading leaderboard';
  }
}

// refresh often; when session becomes 'ended' teacher will see final ranks
loadLeaderboard();
setInterval(loadLeaderboard, 2000);