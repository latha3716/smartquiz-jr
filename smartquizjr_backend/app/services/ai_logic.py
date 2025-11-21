# app/services/ai_logic.py
from agno.agent import Agent, RunOutput
import re
import json
from dotenv import load_dotenv
import os
load_dotenv()

from pydantic import BaseModel
from typing import Dict

import uuid
from app.models import Rag_temp_content
from sqlalchemy.orm import Session
class QuizCreate(BaseModel):
    question: str
    options: Dict[str, str]
    correct_answer: str
    topic: str
    difficulty: str
    age: int


single_question_instructions = [
    "Generate exactly ONE MCQ and return ONLY a single JSON object (no arrays, no commentary).",
    "Use the exact output format below (do NOT add extra fields):",
    """
    {
        "question": "string",
        "options": { "A": "string", "B": "string", "C": "string", "D": "string" },
        "correct_answer": "A|B|C|D",
        "topic": "<the exact topic provided>",
        "difficulty": "<the exact difficulty provided>",
        "age": <integer>
    }
    """,
    
    # Knowledge-base / RAG rule
    "Before generating a question, ALWAYS search the previous questions provided",
    "If ANY question is identical or similar in meaning, structure, or numbers, you MUST generate a completely different question.",
    "Your output must always be fully unique.",
    
    # Core correctness rules
    "Before returning, DOUBLE-CHECK that the correct_answer matches the correct option.",
    "All options must be different and plausible based on the topic.",
    "The question MUST strictly belong to the provided topic. Do not drift or generalize.",
    
    # Universal diversity rules
    "VARY the style of the question on each call. Supported styles:",
    "1. Direct fact question (simple knowledge).",
    "2. Scenario / story (simple real-life situation related to the topic).",
    "3. Compare-type question (which of the following…?).",
    "4. Identification (which one is…?).",
    "5. Missing-element (which option completes this idea?).",
    "6. Object-based or description-based depending on topic.",
    
    # Universal constraints
    "Do NOT repeat the same sentence structure as previous generations.",
    "Do NOT repeat the same entities (names/objects) more than once.",
    "Do NOT use the same numbers or values repeatedly.",
    "Ensure the question is age-appropriate for the given age.",
    
    # No topic-specific examples; everything must derive from teacher-given topic
    "Do NOT assume the topic is math. The topic may be EVS, English, Science, GK, etc.",
    "All logic, vocabulary, and difficulty MUST depend on the given topic.",
    
    # Final reminder
    "Return EXACT topic, difficulty, and age as provided."
]

agno_agent = Agent(
    name = "SmartQuiz-Jr Quiz Generator",
    # model = os.environ.get("GROQ_MODEL"),
    model = os.environ.get("OPENAI_MODEL"),
    
    description="An agent that generates clean, age-appropriate MCQs based on topic, age, and difficulty",
    instructions=single_question_instructions,
    markdown=False,
    add_history_to_context=False,
        
    structured_outputs=False,
    use_json_mode=False,
    parse_response=False,
    output_schema=QuizCreate,
    
)

validate_agent = Agent(
    name = "SmartQuiz-Jr Quiz Question Validator",
    model = os.environ.get("OPENAI_MODEL"),
    
    description="An agent that verfies the preivous questions and generate unique question which is different from the previous question and appropriate to the rules like topic, age, and difficulty",
    instructions=[
        "verify the previous questions from the latest question",
        "the questions should not be repetitive",
        "genenrate a new question which is different from the previous questions but come under the same topic, age, and difficulty",
    ] + (single_question_instructions),
    
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

async def validate_question(db: Session, uuid_id: str):
    questions = db.query(Rag_temp_content).filter_by(uuid_id = uuid_id).all()
    previous = [question.content for question in questions]
    prompt = (
        f"Previous Questions: \n{json.dumps(previous, indent=2)}"
    )
    response: RunOutput = validate_agent.run(prompt, stream = False)
    cleaned = clean_json(response.content)
    return cleaned

async def create_questions(topic: str, age: int, difficulty: str, count: int, db: Session):
    final_questions = []
    session_uuid = str(uuid.uuid4())
    
    for _ in range(count):
        raw_q = generate_single_question(topic, age, difficulty)
        
        db.add(Rag_temp_content(uuid_id = session_uuid, content = raw_q))
        db.commit()
        
        validated = await validate_question(db, session_uuid)
        
        db.add(Rag_temp_content(uuid_id = session_uuid, content = validated))
        db.commit()
        
        final_questions.append(validated)
    
    db.query(Rag_temp_content).filter_by(uuid_id=session_uuid).delete()
    db.commit()

    return final_questions


