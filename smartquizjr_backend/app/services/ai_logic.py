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