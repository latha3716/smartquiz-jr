# app/routes/ai_routes.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas import AIRequest
from app.database import get_db

from app.services.ai_logic import create_questions

router = APIRouter(
    prefix="/ai",
    tags=["AI Logic"]
)

@router.post("/create", status_code=201)
async def create_AI_questions_with_topic(ai_request: AIRequest, db: Session = Depends(get_db)):
    return create_questions(
        ai_request.topic, 
        ai_request.age, 
        ai_request.difficulty, 
        ai_request.questions
    )

    
