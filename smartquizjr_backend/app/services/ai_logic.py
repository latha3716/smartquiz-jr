from agno.agent import Agent, RunOutput
from agno.models.groq import Groq
from agno.models.openai import OpenAIChat

from dotenv import load_dotenv
import os
load_dotenv()

from pydantic import BaseModel
from typing import Dict

class QuizCreate(BaseModel):
    question: str
    options: Dict[str, str]
    correct_answer: str
    topic: str
    difficulty: str

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
    
    build_context=True,
    build_user_context=True,
    add_name_to_context=False,
    add_datetime_to_context=False,
    add_location_to_context=False,
    
    search_knowledge=True,
    add_knowledge_to_context=True,
    enable_agentic_knowledge_filters=False,

    enable_agentic_memory=False,
    enable_user_memories=False,
    add_memories_to_context=False,
    enable_session_summaries=False,
    
    structured_outputs=True,
    output_schema=QuizCreate,
    use_json_mode=True,
    parse_response=True,
    
    reasoning=True,
    reasoning_model=os.environ.get("GROQ_MODEL"),
    reasoning_min_steps=1,
    reasoning_max_steps=3,
    
    retries=2,
    delay_between_retries=1,
    exponential_backoff=True,
    tool_call_limit=0,
    debug_mode=False
)
def create_questions(topic: str, age: int, difficulty: str = 3, questions: int = 10):
    response: RunOutput = agno_agent.run(f"Topic: {topic}, age: {age}, difficulty: {difficulty}, number of questions to return: {questions}", stream=False)
    return response.content