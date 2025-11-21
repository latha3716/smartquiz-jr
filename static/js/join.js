// join.js
window.addEventListener("load", () => {
    sessionStorage.clear();
    localStorage.removeItem("room_code");
    localStorage.removeItem("username");
});

function triggerLumenBloom(button) {
    // Add bloom class
    button.classList.add('blooming');

    // Haptic feedback (mobile only)
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }

    // Remove class after animation completes
    setTimeout(() => {
        button.classList.remove('blooming');
    }, 350);
}

// ========================================
// Toast Notification System
// ========================================
function showToast(message, type = 'error') {
    // Remove existing toast if any
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');

    // Add to DOM
    document.body.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Toast slide out animation (add to CSS or use inline)
const style = document.createElement('style');
style.textContent = `
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
document.head.appendChild(style);

// ========================================
// Input Validation & UX Enhancements
// ========================================
const inputs = document.querySelectorAll('input[type="text"]');

inputs.forEach(input => {
    // Real-time validation feedback
    input.addEventListener('input', (e) => {
        const value = e.target.value.trim();

        // Remove special characters from room code if needed
        if (e.target.name === 'roomcode') {
            e.target.value = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        }
    });

    // Enhanced focus animations
    input.addEventListener('focus', () => {
        input.parentElement.style.transform = 'translateY(-2px)';
        input.parentElement.style.transition = 'transform 0.2s ease';
    });

    input.addEventListener('blur', () => {
        input.parentElement.style.transform = 'translateY(0)';
    });
});


// document.querySelector('form').addEventListener('submit', async (e) => {
//     e.preventDefault();

//     const username = e.target.username.value.trim();
//     const roomcode = e.target.roomcode.value.trim();

//     if (!username || !roomcode) {
//         alert("Please enter your name and room code!");
//         return;
//     }

//     try {
//         // const response = await axios.post(
//         //     `http://192.168.1.9:8000/quiz/join?username=${username}&room_code=${roomcode}`
//         // );
//         const response = await axios.post(
//             `https://smartquiz-jr-production.up.railway.app/quiz/join?username=${username}&room_code=${roomcode}`
//         );

//         const data = response.data;

//         if (data.participant_id) {

//             localStorage.clear();
//             localStorage.setItem("participant_id", data.participant_id);
//             localStorage.setItem("username", data.username);
//             localStorage.setItem("roomcode", data.room_code);

//             window.location.href = `waiting_room.html?roomcode=${data.room_code}&username=${data.username}`;

//         } else {
//             alert("Failed to join room.");
//         }

//     } catch (error) {
//         alert("Failed to join room. Make sure room code is valid.");
//         console.error(error);
//     }
// });

document.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = e.target.username.value.trim();
    const roomcode = e.target.roomcode.value.trim();
    const submitButton = document.querySelector('.join-btn');

    // Validation
    if (!username || !roomcode) {
        showToast("Please enter both your name and room code!", 'error');
        return;
    }

    // Minimum length validation
    if (username.length < 2) {
        showToast("Name must be at least 2 characters!", 'error');
        return;
    }

    if (roomcode.length < 4) {
        showToast("Room code must be at least 4 characters!", 'error');
        return;
    }

    // Trigger Lumen Bloom
    triggerLumenBloom(submitButton);

    // Add loading state
    submitButton.classList.add('loading');
    submitButton.disabled = true;
    const originalText = submitButton.textContent;
    submitButton.textContent = 'JOINING...';

    try {
        // API call (update URL as needed)
        const response = await axios.post(
            `https://smartquiz-jr-production.up.railway.app/quiz/join?username=${encodeURIComponent(username)}&room_code=${encodeURIComponent(roomcode)}`
        );

        const data = response.data;

        if (data.participant_id) {
            // Success - store data
            localStorage.clear();
            localStorage.setItem("participant_id", data.participant_id);
            localStorage.setItem("username", data.username);
            localStorage.setItem("roomcode", data.room_code);

            // Show success feedback
            showToast("Successfully joined! Redirecting...", 'success');
            submitButton.textContent = '✓ JOINED!';
            submitButton.style.background = '#29C36A'; // Verde success

            // Redirect after brief delay for visual feedback
            setTimeout(() => {
                window.location.href = `waiting_room.html?roomcode=${encodeURIComponent(data.room_code)}&username=${encodeURIComponent(data.username)}`;
            }, 800);

        } else {
            throw new Error("Invalid response from server");
        }

    } catch (error) {
        // Error handling
        console.error('Join error:', error);

        let errorMessage = "Failed to join room. Please check your room code.";

        if (error.response) {
            // Server responded with error
            if (error.response.status === 404) {
                errorMessage = "Room not found. Check your room code!";
            } else if (error.response.status === 400) {
                errorMessage = "Invalid room code format.";
            } else if (error.response.status === 403) {
                errorMessage = "Room is closed or full.";
            }
        } else if (error.request) {
            // Network error
            errorMessage = "Connection error. Please check your internet.";
        }

        showToast(errorMessage, 'error');

        // Reset button
        submitButton.classList.remove('loading');
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
});


document.addEventListener('keydown', (e) => {
    // Submit on Ctrl/Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        document.querySelector('form').requestSubmit();
    }
});

// ========================================
// Auto-focus first input on load
// ========================================
window.addEventListener('load', () => {
    const firstInput = document.querySelector('input[name="username"]');
    if (firstInput) {
        // Delay to allow animations to settle
        setTimeout(() => firstInput.focus(), 400);
    }
});

// ========================================
// Performance: Prefetch waiting room
// ========================================
const prefetchLink = document.createElement('link');
prefetchLink.rel = 'prefetch';
prefetchLink.href = 'waiting_room.html';
document.head.appendChild(prefetchLink);

// ========================================
// Accessibility: Announce page load
// ========================================
const announcement = document.createElement('div');
announcement.className = 'sr-only';
announcement.setAttribute('role', 'status');
announcement.setAttribute('aria-live', 'polite');
announcement.textContent = 'Join quiz page loaded. Enter your name and room code to continue.';
document.body.appendChild(announcement);