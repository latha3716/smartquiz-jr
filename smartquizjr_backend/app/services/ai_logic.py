# app/services/ai_logic.py
from agno.agent import Agent, RunOutput
from agno.models.groq import Groq
from agno.models.openai import OpenAIChat

from dotenv import load_dotenv
import os
load_dotenv()

from pydantic import BaseModel, RootModel
from typing import Dict, List

class QuizCreate(BaseModel):
    question: str
    options: Dict[str, str]
    correct_answer: str
    topic: str
    difficulty: str

class QuizList(RootModel[List[QuizCreate]]):
    pass

agno_agent = Agent(
    name = "SmartQuiz-Jr Quiz Generator",
    model = os.environ.get("GROQ_MODEL"),
    
    description="An agent that generates clean, age-appropriate MCQs based on topic, age, and difficulty",
    instructions=[
        "You generate MCQa only in JSON array format.",
        "Strict Rules: Output must be a JSON Array: [...]",
        "Each item in the array is a question object.",
        "Do NOT use keys like question1, question2, etc",
        '''
        Use this structure exactly
        {
            "question": "string",
            "options": { "A": "string", "B": "string", "C": "string", "D": "string" },
            "correct_answer": "A/B/C/D",
            "topic": "<same topic provided>",
            "difficulty": "<same difficulty provided>",
            "age": <age as integer>
            }
        ''',
        "Never return explanations unless asked",
        "NEver add extra fields.",
        "correct_answer MUST be the option KEY(A/B/C/D) not the text",
        "Age must be an integer, not a string",
        "Use the topic EXACTLY as provided",
        "Number of questions = value provided by user"
    ],
    markdown=False,
    add_history_to_context=False,
        
    structured_outputs=True,
    output_schema=QuizCreate,
    use_json_mode=True,
    parse_response=True,
    
)
def create_questions(topic: str, age: int, difficulty: str = "easy", questions: int = 10):
    prompt = (
        f"Topic: {topic}\n"
        f"Age: {age}\n"
        f"Difficulty: {difficulty}\n"
        f"Number of questions: {questions}\n"
        f"Generate the MCQs now."
    )

    response: RunOutput = agno_agent.run(prompt, stream=False)
    return response.content