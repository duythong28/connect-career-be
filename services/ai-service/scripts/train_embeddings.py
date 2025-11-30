"""
Training script for job and user content embeddings
Run this periodically (e.g., daily) to update embeddings
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import psycopg2
import json
import logging
from src.config import settings
from src.services.embedding_service import EmbeddingService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def train_job_embeddings():
    """Generate embeddings for all active jobs"""
    conn = psycopg2.connect(settings.db_dsn)
    embedding_svc = EmbeddingService()
    
    try:
        with conn.cursor() as cur:
            # Fetch all active jobs
            cur.execute("""
                SELECT id, title, description, location, requirements
                FROM jobs
                WHERE status = 'active'
                AND (deleted_at IS NULL OR deleted_at > NOW())
            """)
            jobs = cur.fetchall()
            
            logger.info(f"Processing {len(jobs)} jobs")
            
            for job_id, title, description, location, requirements in jobs:
                # Generate embedding
                requirements_list = requirements if requirements else []
                embedding = embedding_svc.encode_job(
                    title or "",
                    description or "",
                    location or "",
                    requirements_list,
                )
                
                # Upsert into database
                cur.execute("""
                    INSERT INTO job_content_embeddings (job_id, embedding)
                    VALUES (%s, %s::jsonb)
                    ON CONFLICT (job_id) 
                    DO UPDATE SET embedding = EXCLUDED.embedding
                """, (job_id, json.dumps(embedding.tolist())))
            
            conn.commit()
            logger.info("Job embeddings updated successfully")
    
    except Exception as e:
        conn.rollback()
        logger.error(f"Error training job embeddings: {e}", exc_info=True)
        raise
    finally:
        conn.close()


def train_user_embeddings():
    """Generate embeddings for users based on their profiles and preferences"""
    conn = psycopg2.connect(settings.db_dsn)
    embedding_svc = EmbeddingService()
    
    try:
        with conn.cursor() as cur:
            # Fetch users with candidate profiles
            cur.execute("""
                SELECT 
                    u.id as user_id,
                    cp.skills,
                    cp.primary_industry_id,
                    up.preferred_locations,
                    up.skills_like
                FROM users u
                LEFT JOIN candidate_profiles cp ON cp.user_id = u.id
                LEFT JOIN user_preferences up ON up.user_id = u.id
            """)
            users = cur.fetchall()
            
            logger.info(f"Processing {len(users)} users")
            
            for user_id, skills, industry_id, preferred_locations, skills_like in users:
                # Build text from profile
                text_parts = []
                if skills:
                    text_parts.extend(skills)
                if skills_like:
                    text_parts.extend(skills_like)
                if preferred_locations:
                    text_parts.extend(preferred_locations)
                
                if not text_parts:
                    continue  # Skip users with no profile data
                
                text = " ".join(text_parts)
                embedding = embedding_svc.encode_text(text)
                
                # Upsert into database
                cur.execute("""
                    INSERT INTO user_content_embeddings (user_id, embedding)
                    VALUES (%s, %s::jsonb)
                    ON CONFLICT (user_id) 
                    DO UPDATE SET embedding = EXCLUDED.embedding
                """, (user_id, json.dumps(embedding.tolist())))
            
            conn.commit()
            logger.info("User embeddings updated successfully")
    
    except Exception as e:
        conn.rollback()
        logger.error(f"Error training user embeddings: {e}", exc_info=True)
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    logger.info("Starting embedding training...")
    train_job_embeddings()
    train_user_embeddings()
    logger.info("Training complete!")