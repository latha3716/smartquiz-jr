# app/routes/ai_routes.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas import AIRequest, QuizCreate
from app.database import get_db

from app.services.ai_logic import create_questions
import requests
router = APIRouter(
    prefix="/ai",
    tags=["AI Logic"]
)

@router.post("/create", status_code=201)
async def create_AI_questions_with_topic(ai_request: AIRequest, db: Session = Depends(get_db)):
    questions_model, uuid_id =  await create_questions(
        ai_request.topic, 
        ai_request.age, 
        ai_request.difficulty, 
        ai_request.questions,
        db=db
    )
    base_url = "https://smartquiz-jr-production.up.railway.app"
    for i in range(len(questions_model)):
        quiz = QuizCreate(
            question = questions_model[i]['question'],
            options = questions_model[i]['options'],
            correct_answer = questions_model[i]['correct_answer'],
            topic = questions_model[i]['topic'],
            difficulty = questions_model[i]['difficulty'],
            uuid_id = uuid_id
        )
        requests.post(base_url+"/quiz/add", json = quiz.model_dump())
        
    return {
                "status": "success", 
                "created": len(questions_model), 
                "uuid": uuid_id
    }

    

    
