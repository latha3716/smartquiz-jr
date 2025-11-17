#app/models.py
from sqlalchemy import Column, Integer, String, JSON, Float, DateTime, func, Enum, Index
from sqlalchemy.orm import declarative_base
import enum

Base = declarative_base()

class QuizSessionStatus(enum.Enum):
    waiting = "waiting"
    active = "active"
    ended = "ended"
    
class QuizSession(Base):
    __tablename__ = "quiz_sessions"
    id = Column(Integer, primary_key=True, index=True)
    room_code = Column(String, unique = True, index = True)
    template_id = Column(Integer, nullable=True)  # Link to Quiz template if saved elsewhere
    questions = Column(JSON, nullable=False)  # Immutable question set as JSON (list of question IDs or full questions)
    status = Column(Enum(QuizSessionStatus), default=QuizSessionStatus.waiting, nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    config = Column(JSON, nullable=True)  # e.g. time_limit, shuffle

class QuizQuestion(Base):
    __tablename__ = 'quiz_questions'
    
    id = Column(Integer, primary_key = True)
    question = Column(String, nullable = False)
    options = Column(JSON, nullable = False)
    correct_answer = Column(String, nullable = False)
    topic = Column(String, nullable = False)
    difficulty = Column(String, nullable = False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    __table_args__ = (Index('idx_topic', 'topic'),)
    
class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=True)  # For now, nullable since auth isn't added
    session_id = Column(String, nullable=True)  # Optional identifier for a quiz session
    answers = Column(JSON, nullable=False)  # Raw submitted answers {question_id: chosen_option}
    score = Column(Integer, nullable=False)
    total = Column(Integer, nullable=False)
    percentage = Column(Float, nullable=False)
    time_taken_seconds = Column(Float, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    __table_args__ = (Index('idx_session_id', 'session_id'),)
    
class Participant(Base):
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True)
    username = Column(String, nullable=False)
    room_code = Column(String, nullable=False, index=True)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())