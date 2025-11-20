# app/services/ai_logic.py
from agno.agent import Agent, RunOutput
import re
import json
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


single_question_instructions = [
    "Generate exactly ONE MCQ.",
    "Return ONLY a JSON object. No arrays.",
    "Do NOT wrap the object in an array.",
    "Do NOT include explanations.",
    "Do NOT escape the JSON.",
    "Do NOT add extra fields.",
    """
Use this format exactly:
{
  "question": "string",
  "options": {
    "A": "string",
    "B": "string",
    "C": "string",
    "D": "string"
  },
  "correct_answer": "A/B/C/D",
  "topic": "<same topic>",
  "difficulty": "<same difficulty>",
  "age": <integer>
}
    """,
    "Before returning the JSON, double-check that the correct_answer matches the correct option. If unsure, regenerate the question."
]

agno_agent = Agent(
    name = "SmartQuiz-Jr Quiz Generator",
    model = os.environ.get("GROQ_MODEL"),
    
    description="An agent that generates clean, age-appropriate MCQs based on topic, age, and difficulty",
    instructions=single_question_instructions,
    markdown=False,
    add_history_to_context=False,
        
    structured_outputs=False,
    use_json_mode=False,
    parse_response=False,
    output_schema=QuizCreate,
    
)
def clean_json(text: str):
    
    text = text.strip()
    text = re.sub(r"```json|```", "", text).strip()
    
    match = re.search(r"{[\s\S]*}", text)
    if not match:
        raise ValueError("No valid JSON object found.")
    
    json_text = match.group(0)
    return json.loads(json_text)


def generate_single_question(topic: str, age: int, difficulty: str):
    prompt = (
        f"Topic: {topic}\n"
        f"Age: {age}\n"
        f"Difficulty: {difficulty}\n"
        f"Generate exactly ONE MCQ now."
    )

    response: RunOutput = agno_agent.run(prompt, stream=False)
    cleaned = clean_json(response.content)
    return cleaned


def create_questions(topic: str, age: int, difficulty: str, count: int):
    final_questions = []

    for _ in range(count):
        q = generate_single_question(topic, age, difficulty)
        final_questions.append(q)

    return final_questions