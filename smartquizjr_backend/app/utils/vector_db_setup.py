import os
import psycopg
from psycopg.rows import dict_row

# Load DB URL (Railway provides DATABASE_URL)
DATABASE_URL = os.getenv("DATABASE_URL")

# CHANGE THIS to your model's embedding dimension:
EMBEDDING_DIM = 1536  # 1536 for OpenAI text-embedding-3-small


def init_vector_db():
    print("🔄 Initializing Vector Database...")

    # Connect to PostgreSQL
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:

            # 1. Enable pgvector
            print("➡️ Enabling pgvector extension...")
            cur.execute("""CREATE EXTENSION IF NOT EXISTS vector;""")

            # 2. Create vector table
            print("➡️ Creating table...")
            cur.execute(f"""
                CREATE TABLE IF NOT EXISTS "Knowledge__SmartQuiz_jr_Vector_DB__contents" (
                    id SERIAL PRIMARY KEY,
                    content TEXT NOT NULL,
                    metadata JSONB,
                    embedding vector({EMBEDDING_DIM}),
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            """)

            # 3. Create HNSW index (best for small-to-medium datasets)
            print("➡️ Creating HNSW vector index...")
            cur.execute("""
                CREATE INDEX IF NOT EXISTS Knowledge_SmartQuiz_jr_embedding_idx_hnsw
                ON "Knowledge__SmartQuiz_jr_Vector_DB__contents"
                USING hnsw (embedding vector_l2_ops);
            """)

            conn.commit()

    print("✅ Vector DB initialization complete!")
