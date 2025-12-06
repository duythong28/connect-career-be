"""
Training script for Collaborative Filtering factors using Matrix Factorization (ALS)
Generates user_cf_factors and job_cf_factors for hybrid recommendation system
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import numpy as np
import json
import logging
from typing import Dict, Tuple
from collections import defaultdict
from src.config import settings
from src.database import db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ALSMatrixFactorization:
    """Alternating Least Squares for Matrix Factorization"""
    
    def __init__(self, n_factors: int = 64, n_iterations: int = 15, regularization: float = 0.1):
        """
        Args:
            n_factors: Number of latent factors (dimension of factor vectors)
            n_iterations: Number of ALS iterations
            regularization: Regularization parameter (lambda)
        """
        self.n_factors = n_factors
        self.n_iterations = n_iterations
        self.regularization = regularization
    
    def fit(self, interactions: Dict[Tuple[str, str], float]) -> Tuple[Dict[str, np.ndarray], Dict[str, np.ndarray]]:
        """
        Fit ALS model on user-job interactions
        
        Args:
            interactions: Dictionary mapping (user_id, job_id) -> weight
            
        Returns:
            Tuple of (user_factors, job_factors) dictionaries
        """
        logger.info(f"Training ALS with {len(interactions)} interactions, {self.n_factors} factors")
        
        # Build user and job ID mappings
        user_ids = sorted(set(uid for uid, _ in interactions.keys()))
        job_ids = sorted(set(jid for _, jid in interactions.keys()))
        
        user_to_idx = {uid: i for i, uid in enumerate(user_ids)}
        job_to_idx = {jid: i for i, jid in enumerate(job_ids)}
        
        n_users = len(user_ids)
        n_jobs = len(job_ids)
        
        logger.info(f"Found {n_users} users and {n_jobs} jobs")
        
        # Build sparse interaction matrix
        R = np.zeros((n_users, n_jobs), dtype=np.float32)
        for (uid, jid), weight in interactions.items():
            R[user_to_idx[uid], job_to_idx[jid]] = weight
        
        # Initialize factor matrices randomly
        np.random.seed(42)  # For reproducibility
        U = np.random.normal(0, 0.1, (n_users, self.n_factors)).astype(np.float32)
        V = np.random.normal(0, 0.1, (n_jobs, self.n_factors)).astype(np.float32)
        
        # ALS iterations
        for iteration in range(self.n_iterations):
            # Update user factors (fix V, solve for U)
            for i in range(n_users):
                # Get jobs this user interacted with
                job_indices = np.where(R[i, :] > 0)[0]
                if len(job_indices) == 0:
                    continue
                
                V_subset = V[job_indices, :]
                R_subset = R[i, job_indices]
                
                # Solve: (V^T * V + lambda * I) * U[i] = V^T * R[i]
                VtV = V_subset.T @ V_subset
                VtR = V_subset.T @ R_subset
                reg_matrix = np.eye(self.n_factors) * self.regularization
                
                try:
                    U[i, :] = np.linalg.solve(VtV + reg_matrix, VtR)
                except np.linalg.LinAlgError:
                    # Fallback to pseudo-inverse if singular
                    U[i, :] = np.linalg.pinv(VtV + reg_matrix) @ VtR
            
            # Update job factors (fix U, solve for V)
            for j in range(n_jobs):
                # Get users who interacted with this job
                user_indices = np.where(R[:, j] > 0)[0]
                if len(user_indices) == 0:
                    continue
                
                U_subset = U[user_indices, :]
                R_subset = R[user_indices, j]
                
                # Solve: (U^T * U + lambda * I) * V[j] = U^T * R[:, j]
                UtU = U_subset.T @ U_subset
                UtR = U_subset.T @ R_subset
                reg_matrix = np.eye(self.n_factors) * self.regularization
                
                try:
                    V[j, :] = np.linalg.solve(UtU + reg_matrix, UtR)
                except np.linalg.LinAlgError:
                    # Fallback to pseudo-inverse if singular
                    V[j, :] = np.linalg.pinv(UtU + reg_matrix) @ UtR
            
            # Calculate error (optional, for monitoring)
            if iteration % 5 == 0 or iteration == self.n_iterations - 1:
                error = np.sum((R - U @ V.T) ** 2)
                logger.info(f"Iteration {iteration + 1}/{self.n_iterations}, Error: {error:.2f}")
        
        # Convert back to dictionaries
        user_factors = {user_ids[i]: U[i, :] for i in range(n_users)}
        job_factors = {job_ids[j]: V[j, :] for j in range(n_jobs)}
        
        return user_factors, job_factors


def load_interactions() -> Dict[Tuple[str, str], float]:
    """Load user-job interactions from database"""
    logger.info("Loading interactions from database...")
    
    query = """
        SELECT 
            "userId",
            "jobId",
            type,
            weight,
            "createdAt"
        FROM job_interactions
        WHERE "createdAt" IS NOT NULL
        ORDER BY "createdAt" DESC
    """
    
    results = db.execute_query(query)
    logger.info(f"Loaded {len(results)} interaction records")
    
    # Aggregate interactions: (user_id, job_id) -> total_weight
    # Different interaction types have different weights
    interaction_weights = {
        'view': 1.0,
        'save': 2.0,
        'favorite': 3.0,
        'apply': 5.0,
    }
    
    interactions = defaultdict(float)
    for row in results:
        user_id = str(row['userId'])
        job_id = str(row['jobId'])
        interaction_type = row['type'].lower() if row['type'] else 'view'
        base_weight = float(row['weight']) if row['weight'] else 1.0
        
        # Apply type-based weight multiplier
        type_multiplier = interaction_weights.get(interaction_type, 1.0)
        total_weight = base_weight * type_multiplier
        
        # Aggregate: sum weights for same user-job pair
        interactions[(user_id, job_id)] += total_weight
    
    logger.info(f"Aggregated to {len(interactions)} unique user-job pairs")
    return dict(interactions)


def save_user_factors(user_factors: Dict[str, np.ndarray]) -> None:
    """Save user CF factors to database"""
    logger.info(f"Saving {len(user_factors)} user factors...")
    
    saved = 0
    failed = 0
    
    for user_id, factors in user_factors.items():
        try:
            # Normalize factors (optional, but helps with dot product stability)
            factors_normalized = factors / (np.linalg.norm(factors) + 1e-8)
            
            upsert_query = """
                INSERT INTO user_cf_factors ("userId", factors)
                VALUES (%s, %s::jsonb)
                ON CONFLICT ("userId") 
                DO UPDATE SET factors = EXCLUDED.factors
            """
            db.execute_update(upsert_query, (user_id, json.dumps(factors_normalized.tolist())))
            saved += 1
            
            if saved % 100 == 0:
                logger.info(f"Saved {saved}/{len(user_factors)} user factors...")
                
        except Exception as e:
            failed += 1
            logger.error(f"Error saving user factors for {user_id}: {e}")
            continue
    
    logger.info(f"User factors saved: {saved}, Failed: {failed}")


def save_job_factors(job_factors: Dict[str, np.ndarray]) -> None:
    """Save job CF factors to database"""
    logger.info(f"Saving {len(job_factors)} job factors...")
    
    saved = 0
    failed = 0
    
    for job_id, factors in job_factors.items():
        try:
            # Normalize factors (optional, but helps with dot product stability)
            factors_normalized = factors / (np.linalg.norm(factors) + 1e-8)
            
            upsert_query = """
                INSERT INTO job_cf_factors ("jobId", factors)
                VALUES (%s, %s::jsonb)
                ON CONFLICT ("jobId") 
                DO UPDATE SET factors = EXCLUDED.factors
            """
            db.execute_update(upsert_query, (job_id, json.dumps(factors_normalized.tolist())))
            saved += 1
            
            if saved % 100 == 0:
                logger.info(f"Saved {saved}/{len(job_factors)} job factors...")
                
        except Exception as e:
            failed += 1
            logger.error(f"Error saving job factors for {job_id}: {e}")
            continue
    
    logger.info(f"Job factors saved: {saved}, Failed: {failed}")


def train_cf_factors():
    """Main training function"""
    logger.info("="*60)
    logger.info("Starting CF factors training...")
    logger.info("="*60)
    
    try:
        # Load interactions
        interactions = load_interactions()
        
        if len(interactions) < 10:
            logger.warning(
                f"Only {len(interactions)} interactions found. "
                "Need at least 10 interactions for meaningful CF training."
            )
            return
        
        # Train ALS model
        als = ALSMatrixFactorization(
            n_factors=settings.cf_factors_dim,
            n_iterations=15,
            regularization=0.1
        )
        
        user_factors, job_factors = als.fit(interactions)
        
        # Save to database
        save_user_factors(user_factors)
        save_job_factors(job_factors)
        
        logger.info("="*60)
        logger.info("CF factors training complete!")
        logger.info(f"  - User factors: {len(user_factors)}")
        logger.info(f"  - Job factors: {len(job_factors)}")
        logger.info("="*60)
        
    except Exception as e:
        logger.error(f"CF training failed: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    train_cf_factors()