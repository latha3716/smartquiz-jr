# SmartQuizJR

SmartQuizJR is an interactive, web-based quiz platform that connects teachers and students in a live quiz session. Teachers can create AI-powered quizzes, generate a unique room code, and share it with students. Students join the quiz using the code, answer the questions in real time, and then view their score. Teachers can monitor student participation in a waiting room and see the leaderboard after the quiz.

## Key Features

- **Quiz Creation with AI**: Teachers enter a topic, difficulty level, and student age group to auto-generate quiz questions via an AI model.
- **Room Codes**: Each quiz session has a unique room code. Teachers share this code with students to join the session.
- **Live Quiz Sessions**: Students enter the quiz room code and their name to join a live session. Teacher can see who has joined in the waiting room.
- **Real-time Monitoring**: Teachers see a dynamic list of participants in the waiting room and can start the quiz when ready.
- **Auto-Grading**: Once the quiz starts, students answer questions. The system automatically grades submissions and calculates scores.
- **Leaderboard**: After the quiz, a leaderboard displays each student's score, allowing teachers (and optionally students) to see results ranked.
- **Responsive Frontend**: Simple HTML/CSS/JavaScript interface for both teacher and student flows.
- **RESTful API**: Backend built with FastAPI provides endpoints for quiz creation, joining, starting sessions, fetching questions, and submitting answers.
- **Persistent Storage**: Uses a SQL database (e.g. PostgreSQL) via SQLAlchemy/SQLModel to store quiz questions, sessions, participants, and results.

## Technologies Used

- **Backend**: Python 3.11+, FastAPI framework, SQLAlchemy/SQLModel for ORM, Alembic for database migrations.
- **Database**: PostgreSQL (using psycopg2 or similar). The code also references JSONB types, indicating PostgreSQL is expected. (SQLite or other SQL databases may work with minor changes.)
- **AI Integration**: The backend includes an AI logic module (e.g. OpenAI/Groq API) to generate quiz questions. (Requires an API key.)
- **Frontend**: Plain HTML/CSS/JavaScript. Templates in the `templates/` folder and CSS/JS in `static/`.
- **HTTP Server (Frontend)**: A simple Python HTTP server (via `python -m http.server`) is used to serve the static frontend during development (as shown in `Dockerfile.frontend`).
- **Authentication**: JWT-based auth implemented in backend (with endpoints for signup/login), though the provided frontend does not currently use user accounts.
- **Containerization**: Dockerfiles included – one for the backend and one (`Dockerfile.frontend`) to serve static files.

## Folder Structure

```
SmartQuiz Jr/
├── database/                      # (Optional) Database files or backups
├── smartquiz/                     # (Local Python virtual environment; auto-generated)
├── smartquizjr_backend/           # Backend application code (FastAPI)
│   ├── alembic/                  # Database migration scripts
│   ├── app/                      # Main backend package
│   │   ├── main.py               # FastAPI entry point
│   │   ├── database.py           # DB connection setup (engine/session)
│   │   ├── models.py             # ORM models (QuizSession, QuizQuestion, Participant, etc.)
│   │   ├── schemas.py            # Pydantic schemas for request/response
│   │   ├── routes/               # API route modules (quiz, ai_routes, users, etc.)
│   │   ├── services/             # Business logic (AI question generation, scoring, etc.)
│   │   └── utils/                # Utilities (auth, config, etc.)
│   ├── requirements.txt          # Python dependencies
│   ├── Dockerfile                # Containerization for backend
│   └── README.md                 # (Backend-specific docs)
├── static/                       # Frontend static assets
│   ├── css/                      # Stylesheets
│   └── js/                       # JavaScript files for UI logic (join, waiting room, live quiz, teacher flows)
├── templates/                    # Frontend HTML templates
│   ├── index.html               # Main page (links to Join)
│   ├── join.html                # Student join page (enter name & code)
│   ├── waiting_room.html        # Waiting room (students wait for quiz start)
│   ├── live_quiz.html           # Live quiz interface (questions and options)
│   ├── score.html               # Score page (after submitting quiz)
│   ├── teacher_start.html       # Teacher dashboard (create session, see participants)
│   ├── teacher_generate.html    # Teacher quiz generation page (enter topic/difficulty)
│   ├── teacher_leaderboard.html # Teacher leaderboard view
│   └── (login/register pages are present but empty)          
├── Dockerfile.frontend          # Dockerfile for serving static frontend via Python http.server
├── requirements.txt             # (Root-level, may mirror backend requirements)
├── .gitignore                   # Git ignore rules
└── README.md                    # (This project README)
```

**Note**: The `smartquiz/` directory is a local Python virtual environment and not part of source code. You can ignore or delete it after setup.

## Installation & Setup

Follow these steps to run the SmartQuizJR application locally:

### 1. Clone the repository

```bash
git clone https://github.com/chandankumar123456/smartquiz-jr.git
cd smartquiz-jr
```

### 2. Backend Setup (FastAPI)

#### Create and activate a Python virtual environment

```bash
python3 -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate
```

#### Install backend dependencies

```bash
cd smartquizjr_backend
pip install -r requirements.txt
```

#### Create a `.env` file

Create a `.env` file in the `smartquizjr_backend` directory with your configuration:

```env
DATABASE_URI=postgresql://username:password@localhost:5432/smartquizjr
JWT_SECRET_KEY=your_jwt_secret_key
AI_API_KEY=your_openai_api_key
```

Replace the values with:
- Your PostgreSQL database URI
- A secret key for JWT
- Any AI API key

By default the code reads `DATABASE_URI` for the database connection (matching `database.py`).

#### Initialize the database

This will create tables:

```bash
alembic upgrade head
```

Ensure your database server is running and the URL in `DATABASE_URI` points to a valid database.

#### Run the backend server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be served at `http://localhost:8000` by default. You should see FastAPI startup logs.

### 3. Frontend Setup

The frontend is static HTML/CSS/JS located in the `templates/` and `static/` folders. You need to serve these files so that the AJAX calls can reach the API. For development, you can use Python's built-in HTTP server.

#### Serve static content

From the project root (`smartquiz-jr/`), run:

```bash
# Serve static content on port 5500
python3 -m http.server 5500
```

This serves the current directory. The HTML pages will be accessible under `http://localhost:5500/templates/`.

#### Alternative: Use Docker

You can use the provided Dockerfile for the frontend:

```bash
docker build -f Dockerfile.frontend -t smartquizjr-frontend .
docker run -p 5500:5500 smartquizjr-frontend
```

#### Important: Update API Base URL

The JavaScript files use a hard-coded API_BASE URL (e.g., `https://smartquiz-jr-production.up.railway.app`). For local development, you should update each JS file in `static/js/` and set:

```javascript
const API_BASE = "http://localhost:8000";
```

This ensures that API calls go to your local FastAPI server.

### 4. Accessing the App

Open a browser and go to `http://localhost:5500/templates/index.html`.

From there, teachers can navigate to the quiz creation pages and students can click "Join" to enter the room code.

## Usage Guide

### Teacher Flow

#### 1. Generate Quiz Questions

- **Open Teacher Dashboard**: Go to `teacher_start.html` (e.g. `http://localhost:5500/templates/teacher_start.html`).
- **Click "Generate Questions"**: This navigates to the quiz generation page.
- **On Generate Quiz Questions page** (`teacher_generate.html`), enter:
  - Topic (e.g. "Solar System")
  - Difficulty (Easy/Medium/Hard)
  - Age group (5–10)
  - Number of questions (e.g. 10)
- **Click "Generate Questions"**: The backend AI service creates the quiz questions. A status message will appear when generation is complete. This process may take a few seconds.

#### 2. Create a New Session

- Return to the Teacher Dashboard (`teacher_start.html`).
- **Click "Create New Session"**: This sends a request to create a quiz session using the generated questions.
- The page will display a **Room Code** (e.g. AB12CD). Share this code with your students.

#### 3. Monitor Waiting Room

- As students enter the code and join, their names will appear under "Students Joined".
- The teacher page will periodically poll the backend to update the participants list.

#### 4. Start the Quiz

- When ready, **click "Start Quiz"**: This changes the session status to active on the server.
- All students in the waiting room will automatically be redirected to the live quiz page.

#### 5. View Leaderboard

- After the quiz ends, **click "Leaderboard"**: You can enter the room code (or it may be pre-filled) to view final scores for all participants in that session.

### Student Flow

#### 1. Join the Quiz

- Open the main page (`index.html`, e.g. `http://localhost:5500/templates/index.html`).
- **Click "Click to Join"** to go to the join page (`join.html`).
- Enter your **Name** and the **Room Code** given by your teacher, then click **"JOIN QUIZ"**.

#### 2. Waiting Room

- You will enter a waiting room page showing your name and the room code.
- Wait on this screen; the teacher will see that you have joined.
- Once the teacher clicks "Start Quiz", you will be automatically redirected to the live quiz interface.

#### 3. Take the Quiz

- On the Live Quiz page (`live_quiz.html`), questions will appear one by one.
- Select an answer for each question and submit. The quiz will proceed through all questions automatically.

#### 4. View Score

- After submitting the last question, you will be redirected to the Score page (`score.html`).
- Your total score and percentage will be displayed. You can then exit or, if allowed, play again.

## Known Issues & Limitations

- **API Base URL**: The frontend JS is currently hard-coded to a production API URL. For local testing, you must manually update `const API_BASE = "http://localhost:8000";` in each JS file (`teacher_start.js`, `teacher_generate.js`, `join.js`, etc.).
- **Authentication**: Although backend routes for user signup/login exist, the provided frontend pages (`login.html`, `register.html`) are empty. User accounts are not required for the core quiz functionality.
- **Database Setup**: Ensure the database URI is correctly set in `.env` and that the database is accessible. The project uses PostgreSQL (with JSONB support).
- **Session Persistence**: If the server restarts, all in-memory or previous sessions are lost unless persisted in the database.
- **Single Quiz at a Time**: The current UI is geared towards one active session per teacher at a time. Teachers should not create multiple simultaneous sessions with the same code.
- **Browser Compatibility**: The frontend uses modern JavaScript (ES6+) and should work in recent browsers (Chrome, Firefox, Edge).
- **AI Question Quality**: The AI-generated questions depend on the external API (OpenAI/Groq). The results may vary in relevance/accuracy. No moderator interface is provided to edit questions after generation.
- **Security**: There is no HTTPS or user authentication enforced in the simple deployment. For production use, additional security (SSL, stronger auth) is recommended.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source. Please check the repository for license details.

## Support

For issues, questions, or contributions, please visit the [GitHub repository](https://github.com/chandankumar123456/smartquiz-jr).