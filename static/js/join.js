document.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = e.target.username.value.trim();
    const roomcode = e.target.roomcode.value.trim();

    if(!username || !roomcode) {
        alert("Please enter your name and room code!");
        return;
    }

    try {
        await axios.post(
          `http://localhost:8000/quiz/join?username=${username}&room_code=${roomcode}`
        );

        // Save values
        localStorage.setItem("username", username);
        localStorage.setItem("roomcode", roomcode);

        // redirect to waiting room
        window.location.href = `waiting_room.html?roomcode=${roomcode}&username=${username}`;

    } catch (error) {
        alert("Failed to join room. Make sure room code is valid.");
        console.error(error);
    }
});
