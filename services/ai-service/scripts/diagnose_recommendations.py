"""
Diagnostic script to check why recommendations have 0.0 scores
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.database import db
from src.services.embedding_service import embedding_service
from src.services.cf_service import cf_service
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def check_user_data(user_id: str):
    """Check if user has embeddings and CF factors"""
    print(f"\n{'='*60}")
    print(f"Checking user: {user_id}")
    print(f"{'='*60}")
    
    # Check user embedding
    user_emb = embedding_service.get_user_embedding(user_id)
    if user_emb is not None:
        print(f"✅ User embedding found: shape={user_emb.shape}, norm={user_emb.norm():.4f}")
    else:
        print(f"❌ User embedding NOT found in database")
    
    # Check user CF factors
    user_cf = cf_service.get_user_cf_factors(user_id)
    if user_cf is not None:
        print(f"✅ User CF factors found: shape={user_cf.shape}, norm={user_cf.norm():.4f}")
    else:
        print(f"❌ User CF factors NOT found in database")
    
    return user_emb, user_cf


def check_job_data(job_ids: list):
    """Check if jobs have embeddings and CF factors"""
    print(f"\n{'='*60}")
    print(f"Checking {len(job_ids)} jobs")
    print(f"{'='*60}")
    
    jobs_with_emb = 0
    jobs_with_cf = 0
    
    for job_id in job_ids:
        job_emb = embedding_service.get_job_embedding(job_id)
        job_cf = cf_service.get_job_cf_factors(job_id)
        
        if job_emb is not None:
            jobs_with_emb += 1
        if job_cf is not None:
            jobs_with_cf += 1
    
    print(f"Jobs with embeddings: {jobs_with_emb}/{len(job_ids)}")
    print(f"Jobs with CF factors: {jobs_with_cf}/{len(job_ids)}")
    
    if jobs_with_emb == 0:
        print("❌ No job embeddings found! You need to run training script.")
    if jobs_with_cf == 0:
        print("❌ No job CF factors found! You need to run CF training.")
    
    return jobs_with_emb, jobs_with_cf


def check_database_counts():
    """Check how many embeddings/CF factors exist in database"""
    print(f"\n{'='*60}")
    print("Database Statistics")
    print(f"{'='*60}")
    
    try:
        # Count user embeddings
        query = "SELECT COUNT(*) as count FROM user_content_embeddings"
        result = db.execute_query(query)
        user_emb_count = result[0]['count'] if result else 0
        print(f"User embeddings in DB: {user_emb_count}")
        
        # Count job embeddings
        query = "SELECT COUNT(*) as count FROM job_content_embeddings"
        result = db.execute_query(query)
        job_emb_count = result[0]['count'] if result else 0
        print(f"Job embeddings in DB: {job_emb_count}")
        
        # Count user CF factors
        query = "SELECT COUNT(*) as count FROM user_cf_factors"
        result = db.execute_query(query)
        user_cf_count = result[0]['count'] if result else 0
        print(f"User CF factors in DB: {user_cf_count}")
        
        # Count job CF factors
        query = "SELECT COUNT(*) as count FROM job_cf_factors"
        result = db.execute_query(query)
        job_cf_count = result[0]['count'] if result else 0
        print(f"Job CF factors in DB: {job_cf_count}")
        
        # Count active jobs
        query = "SELECT COUNT(*) as count FROM jobs WHERE status = 'active'"
        result = db.execute_query(query)
        active_jobs = result[0]['count'] if result else 0
        print(f"Active jobs in DB: {active_jobs}")
        
        return {
            'user_emb': user_emb_count,
            'job_emb': job_emb_count,
            'user_cf': user_cf_count,
            'job_cf': job_cf_count,
            'active_jobs': active_jobs
        }
    except Exception as e:
        logger.error(f"Error checking database: {e}")
        return None


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Diagnose recommendation issues')
    parser.add_argument('--user-id', type=str, required=True, help='User ID to check')
    parser.add_argument('--job-ids', type=str, nargs='+', help='Job IDs to check')
    
    args = parser.parse_args()
    
    # Check database counts
    stats = check_database_counts()
    
    # Check user data
    user_emb, user_cf = check_user_data(args.user_id)
    
    # Check job data if provided
    if args.job_ids:
        check_job_data(args.job_ids)
    
    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    
    if user_emb is None:
        print("⚠️  User embedding missing - run training script to generate")
    if user_cf is None:
        print("⚠️  User CF factors missing - run CF training to generate")
    
    if stats:
        if stats['job_emb'] == 0:
            print("⚠️  No job embeddings in database - run training script")
        if stats['job_cf'] == 0:
            print("⚠️  No job CF factors in database - run CF training")
    
    print("\nTo fix:")
    print("1. Run: python scripts/train_embeddings.py")
    print("2. Run: python scripts/train_cf_factors.py (if you have this script)")


if __name__ == "__main__":
    main()