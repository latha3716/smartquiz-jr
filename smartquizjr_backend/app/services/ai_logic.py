# app/services/ai_logic.py
from agno.agent import Agent, RunOutput
from agno.tools.duckduckgo import DuckDuckGoTools
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
    # === OUTPUT FORMAT (STRICT) ===
    "Generate exactly ONE MCQ and return ONLY a single JSON object (no arrays, no explanations, no backticks).",
    "Use EXACTLY this JSON structure:",
    '''
    {
        "question": "string",
        "options": { "A": "string", "B": "string", "C": "string", "D": "string" },
        "correct_answer": "A|B|C|D",
        "topic": "<the exact topic provided>",
        "difficulty": "<the exact difficulty provided>",
        "age": <integer>
    }
    ''',
    "Do NOT add extra fields.",

    # === LANGUAGE SIMPLICITY FOR CHILDREN UNDER 10 ===
    "Use extremely simple, child-friendly language suitable for ages under 10.",
    "Keep questions SHORT: maximum 10–15 words.",
    "Use only everyday words a child knows.",
    "Use simple sentence structure: Subject + Verb + Object.",
    "Avoid long sentences, hard words, abstract ideas, or multi-step reasoning.",
    "Avoid negative phrasing such as 'Which is NOT...'.",
    "Use familiar objects (animals, fruits, school items, daily activities).",

    # === STRICT BLOOM’S TAXONOMY MAPPING (INTERNAL ONLY) ===
    "Difficulty determines Bloom’s level:",
    "easy → Remember",
    "medium → Understand",
    "hard → Apply",
    "Never exceed Apply level for children under 10.",
    "Never use Analyze, Evaluate, or Create levels.",

    # === AGE APPROPRIATENESS ===
    "Match complexity to the child's age:",
    "Ages 4–6: very simple facts, colors, shapes, animals, numbers 1–10.",
    "Ages 7–8: simple addition/subtraction (<20), basic science, daily-life EVS.",
    "Ages 9–10: mild reasoning, simple cause-effect, numbers <100.",
    "Do NOT ask abstract, advanced, or multi-step questions.",

    # === TOPIC ADHERENCE ===
    "The question MUST strictly follow the given topic.",
    "Do NOT drift or mix topics.",
    "If topic is Animals, ask only about animals.",
    "If topic is Numbers, ask counting/math only.",

    # === DYNAMIC TOPIC SAFETY (NO HARD-CODING) ===
    "Treat the given topic as a strict boundary.",
    "Do NOT rely on fixed topic rules or lists.",
    "Adapt automatically to ANY topic provided by the teacher.",
    "Use common-sense reasoning to infer what belongs inside the topic.",
    "Ask yourself: 'Is this detail directly part of the given topic?'",
    "If yes → allowed. If no → do NOT include it.",
    "NEVER mix unrelated domains.",
    "Examples:",
    "- If topic = 'Solar System': planets, sun, moon are allowed; animals are NOT.",
    "- If topic = 'Healthy Food': fruits and vegetables are allowed; planets are NOT.",
    "- If topic = 'Traffic Signals': red light and green light allowed; fruits are NOT.",
    "For unfamiliar topics, choose the simplest possible interpretation.",
    "Keep the question strictly focused on ONE simple aspect of the topic.",
    "Never introduce new categories or concepts beyond the topic.",
    "Never drift into subtopics or associations unless they are core to the topic.",
    "Ensure the ENTIRE question and ALL options stay within the topic boundary.",


    # === UNIQUENESS & RAG RULES ===
    "Before generating, ALWAYS check previous questions (RAG/context).",
    "Do NOT repeat any fact, number, example, or sentence structure.",
    "Do NOT reuse same entities (cat, apple, banana, etc.).",
    "Do NOT reuse the same reasoning pattern.",
    "Your question must always be fully unique.",

    # === QUESTION STYLE VARIETY ===
    "Rotate between these simple styles:",
    "1. Direct fact: 'What is...?', 'How many...?'",
    "2. Identification: 'Which one...?'",
    "3. Simple scenario: 'Ravi has 3 balls. He gets 2 more. How many?'",
    "4. Comparison: 'Which is bigger?'",
    "5. Completion: 'What comes after Monday?'",
    "6. True-statement MCQ (child-friendly).",

    # === OPTIONS & CORRECTNESS RULES ===
    "Ensure correct_answer matches the correct option.",
    "All options must be different and plausible.",
    "Only ONE option can be correct.",
    "Avoid silly distractors.",
    "Avoid 'All of the above' and 'None of the above'.",

    # === FINAL CONSTRAINTS ===
    "Return EXACT topic, difficulty, and age as given.",
    "Do NOT assume prior knowledge.",
    "Do NOT generate anything outside the JSON.",
    "If internet search is available, verify facts internally but do NOT include sources.",
]

validate_instructions = [
    # === VALIDATOR ROLE ===
    "You are a STRICT validator for SmartQuiz-Jr.",
    "Your job: ensure the new question is UNIQUE, SIMPLE, AGE-APPROPRIATE, and matches Bloom’s rules.",

    # === VALIDATION PROCESS ===
    "1. Read ALL previous questions.",
    "2. Identify the key fact/concept of each question.",
    "3. Compare the new question with all previous ones.",
    "4. If ANY similarity exists, REJECT and generate a new question.",

    # === WHAT TO AVOID ===
    "Avoid repeating:",
    "- Same facts (even reworded)",
    "- Same numbers",
    "- Same examples/entities",
    "- Same sentence structure",
    "- Same reasoning style",
    "- Same real-life scenario setup",
    "Think in terms of CONCEPTS, not words.",

    # === AGE APPROPRIATENESS CHECK ===
    "Ensure every word is understandable for the child's age.",
    "Reject and rewrite if language is too complex.",
    "Ensure sentence length ≤ 15 words.",
    "Ensure simple vocabulary only.",

    # === STRICT BLOOM’S TAXONOMY CHECK (INTERNAL) ===
    "Difficulty MUST match Bloom’s level:",
    "easy → Remember",
    "medium → Understand",
    "hard → Apply",
    "Do NOT exceed Apply level.",
    "Reject if the cognitive complexity does not match.",

    # === OPTIONS CHECK ===
    "Ensure only one correct option.",
    "Ensure options are distinct, simple, and unambiguous.",
    "Reject if ambiguity exists.",

    # === WHEN VALIDATION FAILS ===
    "If validation fails, generate a COMPLETELY NEW question:",
    "- New fact",
    "- New numbers",
    "- New examples",
    "- New sentence structure",
    "- Still within topic, age, and difficulty",
]


agno_agent = Agent(
    name = "SmartQuiz-Jr Quiz Generator",
    # model = os.environ.get("GROQ_MODEL"),
    model = os.environ.get("OPENAI_MODEL"),
    tools=[DuckDuckGoTools()],
    
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
    tools=[DuckDuckGoTools()],
    
    description="An agent that verfies the preivous questions and generate unique question which is different from the previous question and appropriate to the rules like topic, age, and difficulty",
    instructions= validate_instructions + single_question_instructions,

    
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

    return (final_questions, session_uuid)


