#app/schemas.py
from pydantic import BaseModel, validator, ValidationError
from typing import List, Dict, Optional, Literal
from datetime import datetime
from enum import Enum

class SessionStatus(str, Enum):
    waiting = "waiting"
    active = "active"
    ended = "ended"

class QuizSessionCreate(BaseModel):
    uuid_id: str
    topic: str
    template_id: Optional[int]
    questions: List[int]  # List of question IDs or full question dicts
    status: Optional[SessionStatus] = SessionStatus.waiting
    config: Optional[Dict] = {}

class QuizSessionOut(QuizSessionCreate):
    id: int
    room_code: str
    start_time: Optional[datetime]
    end_time: Optional[datetime]

    class Config:
        orm_mode = True

class LeaderboardEntry(BaseModel):
    id: int
    user_id: int
    username: str
    score: int
    time_taken_seconds: Optional[float]
    submitted_at: Optional[datetime]

    class Config:
        orm_mode = True


class QuizCreate(BaseModel):
    question: str
    options: Dict[str, str]
    correct_answer: str
    topic: str
    difficulty: str
    uuid_id: str
    
    class Config:
        extra = "ignore"

    
class QuizOut(BaseModel):
    id: int
    question: str
    options: Dict[str, str]
    topic: str
    difficulty: str
    correct_answer: str
    
    @validator('options')
    def check_min_options(cls, v):
        if len(v) < 2:
            raise ValueError("There must be at least two options")
        return v

    @validator('correct_answer')
    def correct_answer_in_options(cls, v, values):
        options = values.get('options', {})
        if v not in options.keys():
            raise ValueError("correct_answer must be one of the keys in options")
        return v
    
    class Config:
        orm_mode = True

class QuizSubmit(BaseModel):
    answers: Dict[str, str] # Quiz question IDs mapped to submitted answers
    
class QuizResult(BaseModel):
    score: int
    total: int
    
    
class AIRequest(BaseModel):
    teacher_id: int
    topic: str
    age: int
    difficulty: Literal["easy", "medium", "hard"]
    questions: Optional[int] = 10