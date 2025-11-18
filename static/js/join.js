// join.js
document.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = e.target.username.value.trim();
    const roomcode = e.target.roomcode.value.trim();

    if (!username || !roomcode) {
        alert("Please enter your name and room code!");
        return;
    }

    try {
        const response = await axios.post(
            `http://192.168.1.9:8000/quiz/join?username=${username}&room_code=${roomcode}`
        );
        const data = response.data;

        if (data.participant_id) {

            localStorage.clear();
            localStorage.setItem("participant_id", data.participant_id);
            localStorage.setItem("username", data.username);
            localStorage.setItem("roomcode", data.room_code);

            window.location.href = `waiting_room.html?roomcode=${data.room_code}&username=${data.username}`;

        } else {
            alert("Failed to join room.");
        }

    } catch (error) {
        alert("Failed to join room. Make sure room code is valid.");
        console.error(error);
    }
});
