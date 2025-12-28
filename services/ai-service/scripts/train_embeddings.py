"""
Training script for job and user content embeddings
Updated to match connect-career-be database schema
Run this periodically (e.g., daily) to update embeddings
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import psycopg2
import json
import logging
import time
from typing import List, Optional
from datetime import datetime, timedelta
from google.api_core import exceptions  # Add this import
from src.config import settings
from src.services.embedding_service import EmbeddingService
from src.database import db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def build_job_text(job_data: dict) -> str:
    """Build text representation of job for embedding"""
    parts = []
    
    # Basic job info
    if job_data.get('title'):
        parts.append(job_data['title'])
    
    if job_data.get('summary'):
        parts.append(job_data['summary'])
    
    if job_data.get('description'):
        parts.append(job_data['description'])
    
    if job_data.get('location'):
        parts.append(f"Location: {job_data['location']}")
    
    # Job details
    if job_data.get('jobFunction'):
        parts.append(f"Job Function: {job_data['jobFunction']}")
    
    if job_data.get('seniorityLevel'):
        parts.append(f"Level: {job_data['seniorityLevel']}")
    
    if job_data.get('type'):
        parts.append(f"Type: {job_data['type']}")
    
    # Requirements
    if job_data.get('requirements'):
        requirements = job_data['requirements']
        if isinstance(requirements, list):
            parts.append("Requirements: " + ", ".join(requirements))
        elif isinstance(requirements, str):
            parts.append(f"Requirements: {requirements}")
    
    # Keywords
    if job_data.get('keywords'):
        keywords = job_data['keywords']
        if isinstance(keywords, list):
            parts.append("Keywords: " + ", ".join(keywords))
    
    # Organization info (if available)
    if job_data.get('organization_name'):
        parts.append(f"Company: {job_data['organization_name']}")
    
    if job_data.get('organization_tagline'):
        parts.append(f"Company Tagline: {job_data['organization_tagline']}")
    
    if job_data.get('organization_short_description'):
        parts.append(f"Company Description: {job_data['organization_short_description']}")
    
    if job_data.get('organization_industry'):
        parts.append(f"Industry: {job_data['organization_industry']}")
    
    return "\n".join(filter(None, parts))


def train_job_embeddings():
    """Generate embeddings for all active jobs"""
    logger.info("Starting job embeddings training...")
    embedding_svc = EmbeddingService()
    
    try:
        # Fetch all active jobs with organization info
        query = """
            SELECT 
                j.id,
                j.title,
                j.description,
                j.summary,
                j.location,
                j."jobFunction",
                j."seniorityLevel",
                j.type,
                j.requirements,
                j.keywords,
                o.name as organization_name,
                o.tagline as organization_tagline,
                o."shortDescription" as organization_short_description,
                i.name as organization_industry
            FROM jobs j
            LEFT JOIN organizations o ON o.id = j."organizationId"
            LEFT JOIN industries i ON i.id = o."industryId"
            WHERE j.status = 'active'
            AND (j."deletedAt" IS NULL OR j."deletedAt" > NOW())
        """
        
        jobs = db.execute_query(query)
        logger.info(f"Processing {len(jobs)} jobs")
        
        processed = 0
        failed = 0
        
        for job_row in jobs:
            try:
                job_id = str(job_row['id'])
                
                # Build text representation
                job_text = build_job_text(dict(job_row))
                
                if not job_text.strip():
                    logger.warning(f"Job {job_id} has no text content, skipping")
                    continue
                
                # Generate embedding
                embedding = embedding_svc.encode_text(job_text)
                
                # Upsert into database (using camelCase column name as per entity)
                upsert_query = """
                    INSERT INTO job_content_embeddings ("jobId", embedding)
                    VALUES (%s, %s::jsonb)
                    ON CONFLICT ("jobId") 
                    DO UPDATE SET embedding = EXCLUDED.embedding
                """
                db.execute_update(upsert_query, (job_id, json.dumps(embedding.tolist())))
                
                processed += 1
                if processed % 100 == 0:
                    logger.info(f"Processed {processed}/{len(jobs)} jobs...")
                    
            except Exception as e:
                failed += 1
                logger.error(f"Error processing job {job_row.get('id')}: {e}")
                continue
        
        logger.info(f"Job embeddings training complete! Processed: {processed}, Failed: {failed}")
    
    except Exception as e:
        logger.error(f"Error training job embeddings: {e}", exc_info=True)
        raise


def build_user_text(user_data: dict) -> str:
    """Build text representation of user for embedding"""
    parts = []
    
    # Profile skills
    if user_data.get('skills'):
        skills = user_data['skills']
        if isinstance(skills, list):
            parts.append("Skills: " + ", ".join(skills))
        elif isinstance(skills, str):
            parts.append(f"Skills: {skills}")
    
    # Languages
    if user_data.get('languages'):
        languages = user_data['languages']
        if isinstance(languages, list):
            parts.append("Languages: " + ", ".join(languages))
    
    # Work experiences
    if user_data.get('work_experiences'):
        exp_parts = []
        for exp in user_data['work_experiences']:
            exp_text = []
            if exp.get('jobTitle'):
                exp_text.append(exp['jobTitle'])
            if exp.get('description'):
                exp_text.append(exp['description'])
            if exp.get('skills'):
                exp_skills = exp['skills']
                if isinstance(exp_skills, list):
                    exp_text.append(", ".join(exp_skills))
            if exp_text:
                exp_parts.append(" | ".join(exp_text))
        if exp_parts:
            parts.append("Experience: " + " | ".join(exp_parts))
    
    # Education
    if user_data.get('educations'):
        edu_parts = []
        for edu in user_data['educations']:
            edu_text = []
            if edu.get('institutionName'):
                edu_text.append(edu['institutionName'])
            if edu.get('fieldOfStudy'):
                edu_text.append(edu['fieldOfStudy'])
            if edu.get('degreeType'):
                edu_text.append(edu['degreeType'])
            if edu.get('coursework'):
                coursework = edu['coursework']
                if isinstance(coursework, list):
                    edu_text.append(", ".join(coursework))
            if edu_text:
                edu_parts.append(" | ".join(edu_text))
        if edu_parts:
            parts.append("Education: " + " | ".join(edu_parts))
    
    # User preferences
    if user_data.get('skills_like'):
        skills_like = user_data['skills_like']
        if isinstance(skills_like, list):
            parts.append("Preferred Skills: " + ", ".join(skills_like))
    
    if user_data.get('preferred_locations'):
        locations = user_data['preferred_locations']
        if isinstance(locations, list):
            parts.append("Preferred Locations: " + ", ".join(locations))
    
    if user_data.get('preferred_role_types'):
        role_types = user_data['preferred_role_types']
        if isinstance(role_types, list):
            parts.append("Preferred Roles: " + ", ".join(role_types))
    
    if user_data.get('industries_like'):
        industries = user_data['industries_like']
        if isinstance(industries, list):
            parts.append("Preferred Industries: " + ", ".join(industries))
    
    # Recent job interactions (to understand preferences)
    if user_data.get('recent_interactions'):
        interaction_parts = []
        for interaction in user_data['recent_interactions'][:5]:  # Top 5 recent
            if interaction.get('job_title'):
                interaction_parts.append(interaction['job_title'])
        if interaction_parts:
            parts.append("Recent Interests: " + " | ".join(interaction_parts))
    
    return "\n".join(filter(None, parts))


def train_user_embeddings():
    """Generate embeddings for users based on their profiles, experiences, and preferences"""
    import time
    
    logger.info("Starting user embeddings training...")
    embedding_svc = EmbeddingService()
    
    try:
        # Fetch users with candidate profiles
        query = """
            SELECT DISTINCT
                u.id as user_id
            FROM users u
            LEFT JOIN candidate_profiles cp ON cp."userId" = u.id
            WHERE cp.id IS NOT NULL OR EXISTS (
                SELECT 1 FROM user_preferences up WHERE up."userId" = u.id
            )
        """
        
        users = db.execute_query(query)
        logger.info(f"Found {len(users)} users to process")
        
        processed = 0
        skipped = 0
        failed = 0
        
        # Process in chunks with delays to avoid quota issues
        chunk_size = 10  # Process 10 users at a time
        delay_between_chunks = 2.0  # Wait 2 seconds between chunks
        delay_between_users = 0.5  # Wait 0.5 seconds between individual users
        
        for chunk_start in range(0, len(users), chunk_size):
            chunk = users[chunk_start:chunk_start + chunk_size]
            logger.info(f"Processing chunk {chunk_start // chunk_size + 1}/{(len(users) + chunk_size - 1) // chunk_size} ({len(chunk)} users)")
            
            for user_row in chunk:
                try:
                    user_id = str(user_row['user_id'])
                    
                    # Check if embedding already exists (skip if recent)
                    existing_query = """
                        SELECT "userId"
                        FROM user_content_embeddings
                        WHERE "userId" = %s
                    """
                    existing = db.execute_query(existing_query, (user_id,))
                    
                    # Skip if embedding exists and was updated recently (within last 24 hours)
                    if existing:
                        skipped += 1
                        logger.debug(f"User {user_id} embedding already exists, skipping")
                        continue
                    
                    # Fetch complete user data
                    profile_query = """
                        SELECT 
                            cp.skills,
                            cp.languages
                        FROM candidate_profiles cp
                        WHERE cp."userId" = %s
                        LIMIT 1
                    """
                    profile_result = db.execute_query(profile_query, (user_id,))
                    profile_data = profile_result[0] if profile_result else {}
                    
                    # Fetch work experiences
                    work_exp_query = """
                        SELECT 
                            we."jobTitle",
                            we.description,
                            we.skills
                        FROM work_experiences we
                        JOIN candidate_profiles cp ON cp.id = we."candidateProfileId"
                        WHERE cp."userId" = %s
                        ORDER BY we."startDate" DESC
                    """
                    work_experiences = db.execute_query(work_exp_query, (user_id,))
                    
                    # Fetch education
                    edu_query = """
                        SELECT 
                            e."institutionName",
                            e."fieldOfStudy",
                            e."degreeType",
                            e.coursework
                        FROM educations e
                        JOIN candidate_profiles cp ON cp.id = e."candidateProfileId"
                        WHERE cp."userId" = %s
                        ORDER BY e."graduationDate" DESC NULLS LAST, e."startDate" DESC
                    """
                    educations = db.execute_query(edu_query, (user_id,))
                    
                    # Fetch user preferences
                    pref_query = """
                        SELECT 
                            up."skillsLike",
                            up."preferredLocations",
                            up."preferredRoleTypes",
                            up."industriesLike"
                        FROM user_preferences up
                        WHERE up."userId" = %s
                        LIMIT 1
                    """
                    pref_result = db.execute_query(pref_query, (user_id,))
                    preferences = pref_result[0] if pref_result else {}
                    
                    # Fetch recent job interactions (fixed query)
                    interaction_query = """
                        SELECT DISTINCT ON (j.title)
                            j.title as job_title
                        FROM job_interactions ji
                        JOIN jobs j ON j.id = ji."jobId"
                        WHERE ji."userId" = %s
                        AND ji.type IN ('save', 'favorite', 'apply')
                        ORDER BY j.title, ji."createdAt" DESC
                        LIMIT 5
                    """
                    recent_interactions = db.execute_query(interaction_query, (user_id,))
                    
                    # Build user data dict
                    user_data = {
                        'skills': profile_data.get('skills', []),
                        'languages': profile_data.get('languages', []),
                        'work_experiences': [dict(exp) for exp in work_experiences],
                        'educations': [dict(edu) for edu in educations],
                        'skills_like': preferences.get('skillsLike', []),
                        'preferred_locations': preferences.get('preferredLocations', []),
                        'preferred_role_types': preferences.get('preferredRoleTypes', []),
                        'industries_like': preferences.get('industriesLike', []),
                        'recent_interactions': [dict(inter) for inter in recent_interactions],
                    }
                    
                    # Build text representation
                    user_text = build_user_text(user_data)
                    
                    if not user_text.strip():
                        skipped += 1
                        logger.debug(f"User {user_id} has no profile data, skipping")
                        continue
                    
                    # Generate embedding (with rate limiting built into service)
                    embedding = embedding_svc.encode_text(user_text)
                    
                    # Upsert into database
                    upsert_query = """
                        INSERT INTO user_content_embeddings ("userId", embedding)
                        VALUES (%s, %s::jsonb)
                        ON CONFLICT ("userId") 
                        DO UPDATE SET embedding = EXCLUDED.embedding
                    """
                    db.execute_update(upsert_query, (user_id, json.dumps(embedding.tolist())))
                    
                    processed += 1
                    if processed % 10 == 0:
                        logger.info(f"Processed {processed}/{len(users)} users... (Skipped: {skipped}, Failed: {failed})")
                    
                    # Small delay between users to respect rate limits
                    time.sleep(delay_between_users)
                    
                except exceptions.ResourceExhausted as e:
                    failed += 1
                    logger.error(f"Quota exceeded for user {user_id}: {e}")
                    # Wait longer before continuing
                    logger.warning("Waiting 30 seconds before continuing due to quota limit...")
                    time.sleep(30)
                    continue
                except Exception as e:
                    failed += 1
                    logger.error(f"Error processing user {user_id}: {e}", exc_info=True)
                    continue
            
            # Delay between chunks
            if chunk_start + chunk_size < len(users):
                logger.info(f"Chunk complete. Waiting {delay_between_chunks}s before next chunk...")
                time.sleep(delay_between_chunks)
        
        logger.info(f"User embeddings training complete! Processed: {processed}, Skipped: {skipped}, Failed: {failed}")
    
    except Exception as e:
        logger.error(f"Error training user embeddings: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    logger.info("="*60)
    logger.info("Starting embedding training...")
    logger.info("="*60)
    
    try:
        train_job_embeddings()
        train_user_embeddings()
        logger.info("="*60)
        logger.info("Training complete!")
        logger.info("="*60)
    except Exception as e:
        logger.error(f"Training failed: {e}", exc_info=True)
        sys.exit(1)