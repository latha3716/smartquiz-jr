# app/routes/quiz.py
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from services.quiz_logic import add_quiz, get_all_quizzes, get_quizzes_by_topic, evaluate_answers, get_leaderboard, create_session, get_session
from schemas import QuizCreate, QuizSessionOut, QuizSessionCreate, QuizOut, QuizSubmit, QuizResult, LeaderboardEntry
from typing import List

router = APIRouter(
    prefix="/quiz",
    tags=['quiz']
)

@router.post("/add", response_model=QuizOut)
def create_quiz(quiz: QuizCreate, db: Session = Depends(get_db)):
    return add_quiz(db, quiz.dict())

@router.post("/create", response_model=QuizSessionOut)
def create_new_session(session_in: QuizSessionCreate, db: Session = Depends(get_db)):
    return create_session(db, session_in.questions, session_in.config, session_in.template_id)

@router.get("/session/{session_id}", response_model=QuizSessionOut)
def read_session(session_id: int, db: Session = Depends(get_db)):
    session = get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.get("/all", response_model=list[QuizOut])
def read_all_quizzes(db: Session = Depends(get_db)):
    return get_all_quizzes(db)

@router.get("/topic/{topic}", response_model=list[QuizOut])
def read_quizzes_by_topic(topic: str, difficulty: str = None, db: Session = Depends(get_db)):
    return get_quizzes_by_topic(db, topic, difficulty)

@router.post("/submit", response_model=QuizResult)
def submit_quiz(
    answers: QuizSubmit,
    user_id: str = Query(None),
    session_id: str = Query(None),
    time_taken_seconds: float = Query(None),
    db: Session = Depends(get_db)
):
    return evaluate_answers(db, answers.answers, user_id, session_id, time_taken_seconds)

@router.get("/session/{session_id}/leaderboard", response_model=List[LeaderboardEntry])
def leaderboard(session_id: str, db: Session = Depends(get_db)):
    results = get_leaderboard(db, session_id)
    if not results:
        raise HTTPException(status_code=404, detail="No submissions found for this session")
    return results