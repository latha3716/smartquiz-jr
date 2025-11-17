# app/services/quiz_logic.py
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from models import QuizQuestion, Submission, QuizSession, Participant
from datetime import datetime

# room logic
import random, string
def generate_room_code(length = 6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def add_quiz(db: Session, quiz_data: dict) -> QuizQuestion:
    quiz = QuizQuestion(
        question = quiz_data['question'],
        options = quiz_data['options'],
        correct_answer = quiz_data['correct_answer'],
        topic = quiz_data['topic'],
        difficulty = quiz_data.get('difficulty', '')
    )
    
    db.add(quiz)
    db.commit()
    db.refresh(quiz)
    return quiz

def get_all_quizzes(db: Session):
    return db.query(QuizQuestion).all()

def get_quizzes_by_topic(db: Session, topic: str, difficulty: str = None):
    query = db.query(QuizQuestion).filter(QuizQuestion.topic == topic)
    if difficulty:
        query = query.filter(QuizQuestion.difficulty == difficulty)
    return query.all()

def evaluate_answers(db: Session, answers_dict: dict, user_id: int = None, session_id: str = None, time_taken_seconds: float = None) -> dict:
    
    from sqlalchemy import select
    question_ids = set(db.scalars(select(QuizQuestion.id)).all())
    invalid_ids = [str(id) for id in answers_dict.keys() if int(id) not in question_ids]
    if invalid_ids:
        raise ValueError(f"Invalid question IDs in answers: {', '.join(invalid_ids)}")
    
    
    total = len(answers_dict)
    score = 0

    def normalize_answer(text: str) -> str:
        return text.strip().lower()

    def is_correct(submitted: str, correct: str) -> bool:
        correct_answers = [normalize_answer(a) for a in correct.split(",")]
        return normalize_answer(submitted) in correct_answers

    # for quiz_id, submitted_answer in answers_dict.items():
    #     quiz = db.query(QuizQuestion).filter(QuizQuestion.id == quiz_id).first()
    #     if quiz:
    #         correct = quiz.correct_answer.strip().lower()
    #         submitted = submitted_answer.strip().lower()
    #         if submitted == correct:
    #             score += 1
    
    for quiz_id, submitted_answer in answers_dict.items():
        quiz = db.query(QuizQuestion).filter(QuizQuestion.id == quiz_id).first()
        if quiz and is_correct(submitted_answer, quiz.correct_answer):
            score += 1

    percentage = (score / total) * 100 if total > 0 else 0
    feedback = "Well done!" if percentage > 70 else "Keep practicing!"

    # Save submission record
    submission = Submission(
        user_id=user_id,
        session_id=session_id,
        answers=answers_dict,
        score=score,
        total=total,
        percentage=percentage,
        time_taken_seconds=time_taken_seconds
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    return {"score": score, "total": total, "percentage": percentage, "feedback": feedback}

def get_leaderboard(db: Session, session_id: str):
    return(
        db.query(Submission)
        .filter(Submission.session_id == session_id)
        .order_by(desc(Submission.score), asc(Submission.time_taken_seconds), asc(Submission.submitted_at))
        .all()
    )
    
    
def create_session(db: Session, question_ids: list, config: dict = None, template_id: int = None):
    room_code = generate_room_code()
    session = QuizSession(
        template_id=template_id,
        room_code = room_code,
        questions=question_ids,
        status="waiting",
        config=config or {}
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

def get_session(db: Session, session_id: int):
    return db.query(QuizSession).filter(QuizSession.id == session_id).first()


def add_participant(db: Session, username: str, room_code: str):
    participant = Participant(username = username, room_code = room_code)
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant

def get_participants(db: Session, room_code: str):
    return db.query(Participant).filter(Participant.room_code == room_code).all()
    