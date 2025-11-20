# app/services/ai_logic.py
from agno.agent import Agent, RunOutput
import re
import json
from dotenv import load_dotenv
import os
load_dotenv()

from pydantic import BaseModel, RootModel
from typing import Dict, List

import uuid
from agno.knowledge.knowledge import Knowledge
from agno.vectordb.pgvector import PgVector

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
    "Before generating a question, ALWAYS search the provided knowledge base (Questions_By_LLM).",
    "If ANY question is identical or similar in meaning, structure, or numbers, you MUST generate a completely different question.",
    "Your output must always be fully unique compared to everything in Questions_By_LLM.",
    
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

knowledge = Knowledge(
    name="SmartQuiz-jr Vector DB",
    vector_db= PgVector(
        table_name="Questions_By_LLM",
        db_url=os.environ.get("PG_VECTOR_URI")
    )
)

agno_agent = Agent(
    name = "SmartQuiz-Jr Quiz Generator",
    # model = os.environ.get("GROQ_MODEL"),
    model = os.environ.get("OPENAI_MODEL"),
    knowledge=knowledge,
    search_knowledge=True,
    add_knowledge_to_context=True,
    
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


# def generate_single_question(topic: str, age: int, difficulty: str):
#     prompt = (
#         f"Topic: {topic}\n"
#         f"Age: {age}\n"
#         f"Difficulty: {difficulty}\n"
#         f"Generate exactly ONE MCQ now."
#     )

#     response: RunOutput = agno_agent.run(prompt, stream=False)
#     cleaned = clean_json(response.content)
#     return cleaned

async def generate_single_question(topic: str, age: int, difficulty: str, batch_id: str, max_attempts=5):
    """
    Generates a unique question, using the provided batch_id in metadata for later deletion.
    """
    for attempt in range(max_attempts):
        prompt = (
            f"Topic: {topic}\n"
            f"Age: {age}\n"
            f"Difficulty: {difficulty}\n"
            f"Generate exactly ONE MCQ now. (Attempt {attempt + 1}/{max_attempts})"
        )

        response: RunOutput = await agno_agent.arun(prompt, stream=False)
        
        try:
            cleaned_question_data = clean_json(response.content)
            validated_question = QuizCreate(**cleaned_question_data)
            
            print(f"Generated a unique question (Attempt {attempt + 1}).")
            
            # Return data AND the metadata needed for storage/deletion
            return validated_question.model_dump()

        except (ValueError, Exception) as e:
            print(f"Error parsing response on attempt {attempt + 1}: {e}")
            if attempt == max_attempts - 1:
                raise RuntimeError("Failed to generate a valid, unique question after several attempts.")
            continue

# def create_questions(topic: str, age: int, difficulty: str, count: int):
#     final_questions = []

#     for _ in range(count):
#         q = generate_single_question(topic, age, difficulty)
#         knowledge.add_content(
#             text_content=json.dumps(q)
#         )
#         final_questions.append(q)
        

#     return final_questions

async def create_questions(topic: str, age: int, difficulty: str, count: int):
    """
    Generates a batch of questions, stores them temporarily in the KB, and returns them.
    Includes a try...finally block to ensure cleanup.
    """
    # Generate a unique ID for this specific run/batch
    batch_run_id = str(uuid.uuid4())
    final_questions = []
    
    print(f"Starting batch with ID: {batch_run_id}")

    try:
        for _ in range(count):
            q_data = generate_single_question(topic, age, difficulty, batch_run_id)
            
            # Store the question in the KB with the unique batch_id metadata
            await knowledge.add_content_async(
                text_content=json.dumps(q_data),
                metadata={
                    "batch_id": batch_run_id, # Key metadata for cleanup
                    "topic": topic, 
                    "difficulty": difficulty, 
                    "age": age
                }
            )
            
            final_questions.append(q_data)
            print(f"Added new question to KB: {q_data['question'][:30]}...")
            
    except Exception as e:
        print(f"An error occurred during generation: {e}")
        # Decide if you want to clean up partially generated questions here or in finally
        # We will clean up in the finally block.
    finally:
        # !!! CRITICAL STEP: Delete all questions associated with this batch ID !!!
        # This makes the "temporary avoidance" strategy work.
        print(f"Cleaning up knowledge base entries for batch ID: {batch_run_id}")
        
        # NOTE: Agno's remove_content method by default takes 'content_id'. 
        # To delete by metadata filter (like 'batch_id'), you need to explicitly search 
        # for them first and use their specific IDs for deletion.
        
        # 1. Search for all contents matching the batch_id filter
        # NOTE: Filter functionality needs Agno/PgVector version that supports metadata filtering.
        # 
        try:
            # FIX: Old Agno does NOT support metadata filter
            all_items = await knowledge.get_all_content_async()

            to_delete = [item for item in all_items if item.metadata.get("batch_id") == batch_run_id]

            print(f"Found {len(to_delete)} items to delete.")

            for item in to_delete:
                await knowledge.remove_content_by_id_async(item.id)

            print("Cleanup complete.")

        except Exception as filter_error:
            print(f"Cleanup failed: {filter_error}")

    # Return the generated questions to the user/frontend
    return final_questions