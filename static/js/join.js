// join.js
document.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = e.target.username.value.trim();
    const roomcode = e.target.roomcode.value.trim();

    if(!username || !roomcode) {
        alert("Please enter your name and room code!");
        return;
    }

    // Send the data to the Flask Backend
    const res = await fetch('/join', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, roomcode})
    });

    const data = await res.json();

    if(data.success) {
        window.location.href = `waiting?room=${roomcode}&username=${username}`
    } else {
        alert(data.message || "Room not found")
    }
})