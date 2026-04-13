# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# from routes.quiz import router as quiz_router
from app.routes.quiz import router as quiz_router
from app.routes.ai_routes import router as ai_router

from app.models import Base
from app.database import engine
from app.utils.vector_db_setup import init_vector_db

# fastapi instance
app = FastAPI(title="SmartQuiz Jr Backend", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://smartquiz-jr-eight.vercel.app",
        "https://smartquiz-jr-production-3ccd.up.railway.app", 
        "http://localhost:5500",  # optional for testing
    ],
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers = ["*"],
)
# app.on_event("startup")
# def startup_event():
#     init_vector_db()
Base.metadata.create_all(bind = engine)

app.include_router(quiz_router)
app.include_router(ai_router)
# Test route
@app.get("/ping")
def ping():
    return {"message": "SmartQuiz Jr Backend Is Alive!"}

@app.get("/")
def home():
    return {200: "Working"}

