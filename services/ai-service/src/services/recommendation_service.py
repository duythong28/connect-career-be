import numpy as np
import logging
from typing import List, Tuple
from ..database import db
from ..config import settings
from ..services.embedding_service import embedding_service
from ..services.cf_service import cf_service
from ..models.schemas import RecommendationRequest, UserPreferences

logger = logging.getLogger(__name__)


class RecommendationService:
    def __init__(self):
        self.alpha = settings.hybrid_alpha
    
    def get_candidate_jobs(self, user_id: str, preferences: UserPreferences = None) -> List[str]:
        """Get candidate job IDs with basic filtering"""
        query = """
            SELECT j.id
            FROM jobs j
            WHERE j.status = 'active'
            AND (j."deletedAt" IS NULL OR j."deletedAt" > NOW())
        """
        params = []
        
        # Apply filters from preferences
        if preferences:
            if preferences.hiddenCompanyIds:
                query += " AND j.\"organizationId\" != ALL(%s)"
                params.append(preferences.hiddenCompanyIds)
            
            if preferences.preferredLocations:
                query += " AND j.location = ANY(%s)"
                params.append(preferences.preferredLocations)
            
            if preferences.minSalary:
                query += " AND (j.\"salaryDetails\"->>'minAmount')::int >= %s"
                params.append(preferences.minSalary)
        
        try:
            results = db.execute_query(query, tuple(params) if params else None)
            return [str(row['id']) for row in results]
        except Exception as e:
            logger.error(f"Error getting candidate jobs: {e}")
            # Fallback: get all active jobs
            results = db.execute_query("SELECT id FROM jobs WHERE status = 'active' LIMIT 1000")
            return [str(row['id']) for row in results]
    
    def hybrid_score(self, user_id: str, job_id: str) -> float:
        """Compute hybrid score: content-based + collaborative filtering"""
        # Content-based score
        user_emb = embedding_service.get_user_embedding(user_id)
        job_emb = embedding_service.get_job_embedding(job_id)
        content_score = embedding_service.cosine_similarity(user_emb, job_emb)
        
        # Collaborative filtering score
        user_cf = cf_service.get_user_cf_factors(user_id)
        job_cf = cf_service.get_job_cf_factors(job_id)
        cf_score = cf_service.dot_product(user_cf, job_cf)
        
        # Hybrid combination
        final_score = self.alpha * content_score + (1 - self.alpha) * cf_score
        return final_score
    
    def apply_preference_boosts(
        self,
        job_scores: List[Tuple[str, float]],
        preferences: UserPreferences = None,
    ) -> List[Tuple[str, float]]:
        """Apply boosts/penalties based on user preferences"""
        if not preferences:
            return job_scores
        
        # Get job details for boosting
        job_ids = [job_id for job_id, _ in job_scores]
        if not job_ids:
            return job_scores
        
        try:
            placeholders = ','.join(['%s'] * len(job_ids))
            query = f"""
                SELECT id, "organizationId" as organization_id, location, "salaryDetails" as salary_details
                FROM jobs
                WHERE id IN ({placeholders})
            """
            job_details = db.execute_query(query, tuple(job_ids))
            job_map = {str(row['id']): row for row in job_details}
            
            boosted = []
            for job_id, score in job_scores:
                boost = 0.0
                job = job_map.get(job_id)
                
                if job and preferences:
                    # Boost for preferred locations
                    if preferences.preferredLocations and job.get('location'):
                        if job['location'] in preferences.preferredLocations:
                            boost += 0.1
                    
                    # Penalty for hidden companies
                    if preferences.hiddenCompanyIds and job.get('organization_id'):
                        if str(job['organization_id']) in preferences.hiddenCompanyIds:
                            boost -= 0.5
                    
                    # Boost for preferred company size (if available)
                    # This would require joining with organizations table
                
                boosted.append((job_id, max(0.0, score + boost)))
            
            return boosted
        except Exception as e:
            logger.error(f"Error applying preference boosts: {e}")
            return job_scores
        
    def get_recommendations(self, request: RecommendationRequest) -> Tuple[List[str], List[float]]:
        """Main recommendation logic"""
        # 1. Get candidate jobs
        candidate_job_ids = self.get_candidate_jobs(request.userId, request.preferences)
        
        if not candidate_job_ids:
            logger.warning(f"No candidate jobs found for user {request.userId}")
            return [], []
        
        # Limit candidates for performance - reduce from 1000 to 500
        if len(candidate_job_ids) > 500:
            candidate_job_ids = candidate_job_ids[:500]
        
        # 2. Batch load all embeddings and CF factors at once
        logger.info(f"Loading embeddings and CF factors for {len(candidate_job_ids)} jobs")
        
        # Load user embedding once
        user_emb = embedding_service.get_user_embedding(request.userId)
        user_cf = cf_service.get_user_cf_factors(request.userId)

        if user_emb is None:
            logger.warning(f"User {request.userId} has no embedding in database")
            return [], []  # Early return if no user embedding
        
        if user_cf is None:
            logger.warning(f"User {request.userId} has no CF factors in database")

        # Batch load all job embeddings
        job_embeddings = {}
        job_cf_factors = {}
        
        # Load job embeddings in batch
        placeholders = ','.join(['%s'] * len(candidate_job_ids))
        try:
            emb_query = f"""
                SELECT "jobId", embedding
                FROM job_content_embeddings
                WHERE "jobId" IN ({placeholders})
            """
            emb_results = db.execute_query(emb_query, tuple(candidate_job_ids))
            for row in emb_results:
                job_id = str(row['jobId'])
                emb_data = row['embedding']
                if emb_data:
                    if isinstance(emb_data, list):
                        job_embeddings[job_id] = np.array(emb_data, dtype=np.float32)
                    elif isinstance(emb_data, str):
                        import json
                        job_embeddings[job_id] = np.array(json.loads(emb_data), dtype=np.float32)
                    else:
                        job_embeddings[job_id] = np.array(emb_data, dtype=np.float32)
        except Exception as e:
            logger.error(f"Error batch loading job embeddings: {e}")
        
        # Load job CF factors in batch
        try:
            cf_query = f"""
                SELECT "jobId", factors
                FROM job_cf_factors
                WHERE "jobId" IN ({placeholders})
            """
            cf_results = db.execute_query(cf_query, tuple(candidate_job_ids))
            for row in cf_results:
                job_id = str(row['jobId'])
                factors_data = row['factors']
                if factors_data:
                    if isinstance(factors_data, list):
                        job_cf_factors[job_id] = np.array(factors_data, dtype=np.float32)
                    elif isinstance(factors_data, str):
                        import json
                        job_cf_factors[job_id] = np.array(json.loads(factors_data), dtype=np.float32)
                    else:
                        job_cf_factors[job_id] = np.array(factors_data, dtype=np.float32)
        except Exception as e:
            logger.error(f"Error batch loading job CF factors: {e}")
        
        # 3. Score each candidate using pre-loaded data - VECTORIZED APPROACH
        scored_jobs = []
        user_emb_norm = np.linalg.norm(user_emb) if user_emb is not None else 1.0
        
        for job_id in candidate_job_ids:
            try:
                job_emb = job_embeddings.get(job_id)
                job_cf = job_cf_factors.get(job_id)
                
                # Content-based score
                if job_emb is not None:
                    content_score = float(np.dot(user_emb, job_emb) / (user_emb_norm * np.linalg.norm(job_emb)))
                else:
                    content_score = 0.0

                # Collaborative filtering score
                if user_cf is not None and job_cf is not None:
                    cf_score = float(np.dot(user_cf, job_cf))
                else:
                    cf_score = 0.0

                # Hybrid combination
                final_score = self.alpha * content_score + (1 - self.alpha) * cf_score
                
                # Append the score
                scored_jobs.append((job_id, final_score))
            except Exception as e:
                logger.error(f"Error scoring job {job_id}: {e}")
                continue
        
        # 4. Apply preference boosts
        scored_jobs = self.apply_preference_boosts(scored_jobs, request.preferences)
        
        # 5. Sort by score (descending)
        scored_jobs.sort(key=lambda x: x[1], reverse=True)
        
        # 6. Return top N
        top_jobs = scored_jobs[:request.limit]
        top_job_ids = [job_id for job_id, _ in top_jobs]
        top_scores = [score for _, score in top_jobs]
        
        logger.info(f"Generated {len(top_job_ids)} recommendations for user {request.userId}")
        return top_job_ids, top_scores



recommendation_service = RecommendationService()