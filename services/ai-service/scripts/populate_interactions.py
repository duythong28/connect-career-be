"""
Script to populate job_interactions table from existing saved_jobs, favorite_jobs, and applications
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.database import db
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def populate_interactions():
    """Populate job_interactions from existing data"""
    logger.info("Starting to populate job_interactions...")
    
    # 1. Get saved jobs
    saved_query = """
        SELECT "userId", "jobId", "savedAt" as created_at
        FROM saved_jobs
    """
    saved_jobs = db.execute_query(saved_query)
    logger.info(f"Found {len(saved_jobs)} saved jobs")
    
    # 2. Get favorite jobs
    favorite_query = """
        SELECT "userId", "jobId", "favoritedAt" as created_at
        FROM favorite_jobs
    """
    favorite_jobs = db.execute_query(favorite_query)
    logger.info(f"Found {len(favorite_jobs)} favorite jobs")
    
    # 3. Get applications
    application_query = """
        SELECT "candidateId" as "userId", "jobId", "appliedDate" as created_at
        FROM applications
        WHERE "appliedDate" IS NOT NULL
    """
    applications = db.execute_query(application_query)
    logger.info(f"Found {len(applications)} applications")
    
    # 4. Insert into job_interactions
    insert_query = """
        INSERT INTO job_interactions ("userId", "jobId", type, weight, "createdAt")
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT DO NOTHING
    """
    
    inserted = 0
    
    # Insert saved jobs
    for row in saved_jobs:
        try:
            db.execute_update(insert_query, (
                str(row['userId']),
                str(row['jobId']),
                'save',
                2.0,
                row['created_at']
            ))
            inserted += 1
        except Exception as e:
            logger.error(f"Error inserting saved job interaction: {e}")
    
    # Insert favorite jobs
    for row in favorite_jobs:
        try:
            db.execute_update(insert_query, (
                str(row['userId']),
                str(row['jobId']),
                'favorite',
                3.0,
                row['created_at']
            ))
            inserted += 1
        except Exception as e:
            logger.error(f"Error inserting favorite job interaction: {e}")
    
    # Insert applications
    for row in applications:
        try:
            db.execute_update(insert_query, (
                str(row['userId']),
                str(row['jobId']),
                'apply',
                5.0,
                row['created_at']
            ))
            inserted += 1
        except Exception as e:
            logger.error(f"Error inserting application interaction: {e}")
    
    logger.info(f"Inserted {inserted} interactions into job_interactions table")
    logger.info("Done!")

if __name__ == "__main__":
    populate_interactions()