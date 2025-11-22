# app/routes/quiz.py
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import asc, desc, cast, Integer
from app.database import get_db
from app.services.quiz_logic import add_quiz, get_all_quizzes, get_quizzes_by_topic, evaluate_answers, get_leaderboard, create_session, get_session, add_participant, get_participants, get_quizzes_by_uuid_id
from app.schemas import QuizCreate, QuizSessionOut, QuizSessionCreate, QuizOut, QuizSubmit, QuizResult, LeaderboardEntry
from typing import List
from app.models import QuizSession, Submission, Participant

router = APIRouter(
    prefix="/quiz",
    tags=['quiz']
)

@router.get("/session/room/{room_code}", response_model=QuizSessionOut)
def read_session(room_code: str, db: Session = Depends(get_db)):
    session = db.query(QuizSession).filter(QuizSession.room_code == room_code).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.get("/all", response_model=list[QuizOut])
def read_all_quizzes(db: Session = Depends(get_db)):
    return get_all_quizzes(db)

@router.get("/by-uuid/{uuid_id}", response_model = List[QuizOut])
def read_questions_by_uuid_id(uuid_id: str, db: Session = Depends(get_db)):
    return get_quizzes_by_uuid_id(db, uuid_id=uuid_id)

@router.get("/topic/{topic}", response_model=list[QuizOut])
def read_quizzes_by_topic(topic: str, difficulty: str = None, db: Session = Depends(get_db)):
    return get_quizzes_by_topic(db, topic, difficulty)

@router.get("/session/room/{room_code}/leaderboard")
def leaderboard_by_room(room_code: str, db: Session = Depends(get_db)):
    results = (
        db.query(
            Submission.id,
            Submission.user_id,
            Participant.username,
            Submission.score,
            Submission.time_taken_seconds,
            Submission.submitted_at
        )
        .join(Participant, cast(Submission.user_id, Integer) == Participant.id)
        .filter(Submission.session_id == room_code)
        .order_by(desc(Submission.score), asc(Submission.time_taken_seconds), asc(Submission.submitted_at))
        .all()
    )

    if not results:
        raise HTTPException(status_code=404, detail="No submissions found for this session")

    return [
        {
            "id": r[0],
            "user_id": r[1],
            "username": r[2],
            "score": r[3],
            "time_taken_seconds": r[4],
            "submitted_at": r[5],
        }
        for r in results
    ]

@router.get("/session/{session_id}/leaderboard")
def leaderboard(session_id: str, db: Session = Depends(get_db)):
    
    # Join Submission with Participant to include username
    results = (
        db.query(
            Submission.id,
            Submission.user_id,
            Participant.username,
            Submission.score,
            Submission.time_taken_seconds,
            Submission.submitted_at
        )
        # .join(Participant, Submission.user_id == Participant.username)
        .join(Participant, Submission.user_id == Participant.id)
        .filter(Submission.session_id == session_id)
        .order_by(desc(Submission.score), asc(Submission.time_taken_seconds), asc(Submission.submitted_at))
        .all()
    )

    if not results:
        raise HTTPException(status_code=404, detail="No submissions found for this session")

    # Convert DB rows into list of dicts
    return [
        {
            "id": r[0],
            "user_id": r[1],
            "username": r[2],
            "score": r[3],
            "time_taken_seconds": r[4],
            "submitted_at": r[5],
        }
        for r in results
    ]

@router.get("/participants/{room_code}")
def list_participants(room_code: str, db: Session = Depends(get_db)):
    return get_participants(db, room_code)

@router.post("/join")
def join_quiz(username: str = Query(...), room_code: str = Query(...), db: Session = Depends(get_db)):
    participant = add_participant(db, username, room_code)
    return {
        "participant_id": participant.id,
        "username": participant.username,
        "room_code": participant.room_code
    }

@router.post("/add", response_model=QuizOut)
def create_quiz(quiz: QuizCreate, db: Session = Depends(get_db)):
    return add_quiz(db, quiz.dict())

@router.post("/create", response_model=QuizSessionOut)
def create_new_session(session_in: QuizSessionCreate, db: Session = Depends(get_db)):
    return create_session(
        db,
        session_in.questions,
        session_in.uuid_id,     # correct
        session_in.topic,       # correct
        session_in.config,      # correct
        session_in.template_id  # correct
    )


@router.post("/submit", response_model=QuizResult)
def submit_quiz(
    answers: QuizSubmit,
    user_id: str = Query(None),
    session_id: str = Query(None),
    time_taken_seconds: float = Query(None),
    db: Session = Depends(get_db)
):
    return evaluate_answers(db, answers.answers, user_id, session_id, time_taken_seconds)

from datetime import datetime
from app.models import QuizSessionStatus

@router.patch("/session/{room_code}/start")
def start_session(room_code: str, db: Session = Depends(get_db)):
    session = db.query(QuizSession).filter(QuizSession.room_code == room_code).first()
    if not session:
        raise HTTPException(status_code=404, detail="Room not found")

    session.status = QuizSessionStatus.active
    from datetime import UTC
    session.start_time = datetime.now(UTC)
    db.commit()
    return {"message": "Quiz started!"}