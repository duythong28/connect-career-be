import numpy as np
import logging
from typing import List, Tuple
from ..database import db
from ..config import settings
from ..services.embedding_service import embedding_service
from ..services.cf_service import cf_service
from ..models.schemas import RecommendationRequest, UserPreferences
from .recommendation_cache import get_recommendation_cache

logger = logging.getLogger(__name__)


class RecommendationService:
    def __init__(self):
        self.alpha = settings.hybrid_alpha
        self.cache = get_recommendation_cache()  #
    
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
    
    def get_candidate_jobs_optimized(self, user_id: str, preferences: UserPreferences = None) -> List[str]:
        """Get candidate jobs with better filtering to reduce set size"""
        query = """
            SELECT j.id
            FROM jobs j
            WHERE j.status = 'active'
            AND (j."deletedAt" IS NULL OR j."deletedAt" > NOW())
            -- Only get jobs that have embeddings
            AND EXISTS (
                SELECT 1 FROM job_content_embeddings jce 
                WHERE jce."jobId" = j.id
            )
        """
        params = []
        
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
        
        # Limit early to reduce memory usage
        query += " LIMIT 200"  # Reduced from 500
        
        results = db.execute_query(query, tuple(params) if params else None)
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
        """Main recommendation logic with caching"""
        cache_key = {
            'userId': request.userId,
            'limit': request.limit,
            'preferences': self._serialize_preferences(request.preferences) if request.preferences else None,
        }
        
        if self.cache:
            cached_result = self.cache.get(request.userId, cache_key)
            if cached_result is not None:
                logger.info(f"Returning cached recommendations for user {request.userId}")
                return cached_result
    
        candidate_job_ids = self.get_candidate_jobs_optimized(request.userId, request.preferences)
        
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
        try:
            emb_query = """
                SELECT "jobId", embedding
                FROM job_content_embeddings
                WHERE "jobId" = ANY(%s::uuid[])
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
            cf_query = """
                SELECT "jobId", factors
                FROM job_cf_factors
                WHERE "jobId" = ANY(%s::uuid[])
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
        self.cache.set_recommendations(request.userId, cache_key, top_job_ids, top_scores, ttl=300)
        return top_job_ids, top_scores
    
    def get_recommendations_optimized(self, request: RecommendationRequest) -> Tuple[List[str], List[float]]:
        """Optimized version using pgvector database-level search"""
        
        # Get user embedding once
        user_emb = embedding_service.get_user_embedding(request.userId)
        if user_emb is None:
            return [], []
        
        # Convert to pgvector format: '[0.1,0.2,...]'
        user_emb_str = '[' + ','.join(map(str, user_emb.tolist())) + ']'
        
        # Single query with database-level vector similarity search
        query = """
            WITH vector_similarity AS (
                SELECT 
                    j.id,
                    j."organizationId",
                    j.location,
                    j."salaryDetails",
                    -- Content-based score using pgvector cosine distance
                    -- Cast jsonb to vector for pgvector operations
                    1 - (jce.embedding::text::vector <=> %s::vector) AS content_score,
                    -- Get CF factors if available
                    jcf.factors AS cf_factors
                FROM jobs j
                INNER JOIN job_content_embeddings jce ON j.id = jce."jobId"
                LEFT JOIN job_cf_factors jcf ON j.id = jcf."jobId"
                WHERE j.status = 'active'
                AND (j."deletedAt" IS NULL OR j."deletedAt" > NOW())
                -- Apply preference filters
                AND (%s::uuid[] IS NULL OR j."organizationId" != ALL(%s::uuid[]))
                AND (%s::text[] IS NULL OR j.location = ANY(%s::text[]))
                AND (%s::int IS NULL OR (j."salaryDetails"->>'minAmount')::int >= %s)
                -- Use vector index for fast similarity search
                -- Cast jsonb to vector for ordering
                ORDER BY jce.embedding::text::vector <=> %s::vector
                LIMIT 1000  -- Get more candidates for re-ranking
            )
            SELECT 
                id,
                content_score,
                cf_factors
            FROM vector_similarity
            ORDER BY content_score DESC
            LIMIT %s
        """
        
        # Prepare parameters
        hidden_companies = request.preferences.hiddenCompanyIds if request.preferences else None
        preferred_locations = request.preferences.preferredLocations if request.preferences else None
        min_salary = request.preferences.minSalary if request.preferences else None
        
        params = (
            user_emb_str,  # vector query
            hidden_companies, hidden_companies,
            preferred_locations, preferred_locations,
            min_salary, min_salary,
            user_emb_str,  # vector query for ORDER BY
            request.limit
        )
        
        results = db.execute_query(query, params)
        
        # Process results and compute hybrid scores
        user_cf = cf_service.get_user_cf_factors(request.userId)
        scored_jobs = []
        
        for row in results:
            job_id = str(row['id'])
            content_score = float(row['content_score'])
            
            # CF score
            if user_cf is not None and row['cf_factors']:
                cf_factors = np.array(row['cf_factors'], dtype=np.float32)
                cf_score = float(np.dot(user_cf, cf_factors))
            else:
                cf_score = 0.0
            
            # Hybrid score
            final_score = self.alpha * content_score + (1 - self.alpha) * cf_score
            scored_jobs.append((job_id, final_score))
        
        # Apply preference boosts
        scored_jobs = self.apply_preference_boosts(scored_jobs, request.preferences)
        scored_jobs.sort(key=lambda x: x[1], reverse=True)
        
        top_job_ids = [job_id for job_id, _ in scored_jobs]
        top_scores = [score for _, score in scored_jobs]
        
        return top_job_ids, top_scores
    def get_similar_jobs(self, job_id: str, limit: int = 10, exclude_job_id: bool = True) -> Tuple[List[str], List[float]]:
        """Get similar jobs based on job embedding similarity with caching"""   
        try:
            cache_key = {
                'jobId': job_id,
                'limit': limit,
                'excludeJobId': exclude_job_id,
            }
            
            if self.cache:
                cached_result = self.cache.get_similar_jobs(job_id, cache_key)
                if cached_result is not None:
                    logger.info(f"Returning cached similar jobs for job {job_id}")
                    return cached_result
            
            # Get the source job's embedding
            source_emb = embedding_service.get_job_embedding(job_id)
            if source_emb is None:
                logger.warning(f"Job {job_id} has no embedding in database")
                return [], []
            
            # Get candidate jobs (active jobs only)
            query = """
                SELECT j.id
                FROM jobs j
                WHERE j.status = 'active'
                AND (j."deletedAt" IS NULL OR j."deletedAt" > NOW())
            """
            if exclude_job_id:
                query += " AND j.id != %s"
                params = (job_id,)
            else:
                params = None
            
            try:
                results = db.execute_query(query, params)
                candidate_job_ids = [str(row['id']) for row in results]
            except Exception as e:
                logger.error(f"Error getting candidate jobs: {e}")
                return [], []
            
            if not candidate_job_ids:
                logger.warning("No candidate jobs found")
                return [], []
            
            # Limit candidates for performance
            if len(candidate_job_ids) > 500:
                candidate_job_ids = candidate_job_ids[:500]
            
            # Batch load all job embeddings
            logger.info(f"Loading embeddings for {len(candidate_job_ids)} candidate jobs")
            job_embeddings = {}
            
            placeholders = ','.join(['%s'] * len(candidate_job_ids))
            try:
                emb_query =  """
                    SELECT "jobId", embedding
                    FROM job_content_embeddings
                    WHERE "jobId" = ANY(%s::uuid[])
                """
                emb_results = db.execute_query(emb_query, tuple(candidate_job_ids))
                for row in emb_results:
                    job_id_candidate = str(row['jobId'])
                    emb_data = row['embedding']
                    if emb_data:
                        if isinstance(emb_data, list):
                            job_embeddings[job_id_candidate] = np.array(emb_data, dtype=np.float32)
                        elif isinstance(emb_data, str):
                            import json
                            job_embeddings[job_id_candidate] = np.array(json.loads(emb_data), dtype=np.float32)
                        else:
                            job_embeddings[job_id_candidate] = np.array(emb_data, dtype=np.float32)
            except Exception as e:
                logger.error(f"Error batch loading job embeddings: {e}")
            
            # Compute similarity scores
            scored_jobs = []
            source_emb_norm = np.linalg.norm(source_emb)
            
            for candidate_id in candidate_job_ids:
                try:
                    candidate_emb = job_embeddings.get(candidate_id)
                    if candidate_emb is not None:
                        # Compute cosine similarity
                        similarity = float(np.dot(source_emb, candidate_emb) / (source_emb_norm * np.linalg.norm(candidate_emb)))
                        scored_jobs.append((candidate_id, similarity))
                except Exception as e:
                    logger.error(f"Error computing similarity for job {candidate_id}: {e}")
                    continue
            
            # Sort by similarity (descending)
            scored_jobs.sort(key=lambda x: x[1], reverse=True)
            
            # Return top N
            top_jobs = scored_jobs[:limit]
            top_job_ids = [job_id for job_id, _ in top_jobs]
            top_scores = [score for _, score in top_jobs]
            
            if self.cache:
                self.cache.set_similar_jobs(
                    job_id,
                    cache_key,
                    top_job_ids,
                    top_scores,
                    ttl=300  # 5 minutes
                )
            
            logger.info(f"Generated {len(top_job_ids)} similar jobs for job {job_id}")
            return top_job_ids, top_scores
        except Exception as e:
            logger.error(f"Error getting similar jobs for {job_id}: {e}", exc_info=True)
            return [], []
        
    def get_similar_jobs_optimized(self, job_id: str, limit: int = 10, exclude_job_id: bool = True) -> Tuple[List[str], List[float]]:
        """Optimized using pgvector database-level search"""
        
        # Get source job embedding
        source_emb = embedding_service.get_job_embedding(job_id)
        if source_emb is None:
            return [], []
        
        source_emb_str = '[' + ','.join(map(str, source_emb.tolist())) + ']'
        
        # Single query with vector similarity
        # Cast jsonb to vector for pgvector operations
        query = """
            SELECT 
                j.id,
                1 - (jce.embedding::text::vector <=> %s::vector) AS similarity
            FROM jobs j
            INNER JOIN job_content_embeddings jce ON j.id = jce."jobId"
            WHERE j.status = 'active'
            AND (j."deletedAt" IS NULL OR j."deletedAt" > NOW())
        """
        
        params = [source_emb_str]
        
        # Conditionally exclude the job_id
        if exclude_job_id:
            query += " AND j.id != %s"
            params.append(job_id)
        
        query += """
            ORDER BY jce.embedding::text::vector <=> %s::vector
            LIMIT %s
        """
        params.extend([source_emb_str, limit])
        
        try:
            results = db.execute_query(query, tuple(params))
            
            job_ids = [str(row['id']) for row in results]
            scores = [float(row['similarity']) for row in results]
            
            return job_ids, scores
        except Exception as e:
            logger.error(f"Error in optimized similar jobs: {e}")
            # Fallback to old method
            return self.get_similar_jobs(job_id, limit, exclude_job_id=exclude_job_id)
    def _serialize_preferences(self, preferences: UserPreferences) -> dict:
        """Serialize preferences for cache key"""
        if not preferences:
            return None
        return {
            'hiddenCompanyIds': sorted(preferences.hiddenCompanyIds) if preferences.hiddenCompanyIds else None,
            'preferredLocations': sorted(preferences.preferredLocations) if preferences.preferredLocations else None,
            'minSalary': preferences.minSalary,
        }
    def get_candidate_recommendations(
    self, 
    job_id: str, 
    limit: int = 20, 
    exclude_applied: bool = True,
    min_score: float = None
    ) -> Tuple[List[str], List[float]]:
        """Get candidate recommendations for a job (recruiter side)"""
        try:
            # Get the job's embedding
            job_emb = embedding_service.get_job_embedding(job_id)
            if job_emb is None:
                logger.warning(f"Job {job_id} has no embedding in database")
                return [], []
            
            job_cf = cf_service.get_job_cf_factors(job_id)
            job_emb_norm = np.linalg.norm(job_emb)
            
            # OPTIMIZATION 1: Only get users who have embeddings (early filtering)
            query = """
                SELECT DISTINCT uce."userId"
                FROM user_content_embeddings uce
                INNER JOIN candidate_profiles cp ON uce."userId" = cp."userId"
                WHERE uce.embedding IS NOT NULL
                AND cp."userId" IS NOT NULL
            """
            
            # Exclude users who already applied
            if exclude_applied:
                query += """
                    AND uce."userId" NOT IN (
                        SELECT DISTINCT ji."userId"
                        FROM job_interactions ji
                        WHERE ji."jobId" = %s
                        AND ji.type = 'apply'
                    )
                """
                params = (job_id,)
            else:
                params = None
            
            # OPTIMIZATION 2: Limit early to reduce memory
            query += " LIMIT 500"
            
            try:
                results = db.execute_query(query, params)
                candidate_user_ids = [str(row['userId']) for row in results]
            except Exception as e:
                logger.error(f"Error getting candidate users: {e}")
                return [], []
            
            if not candidate_user_ids:
                logger.warning("No candidate users found")
                return [], []
            
            # OPTIMIZATION 3: Batch load embeddings using array parameter (more efficient)
            logger.info(f"Loading embeddings for {len(candidate_user_ids)} candidate users")
            
            # Use PostgreSQL array parameter instead of IN clause
            emb_query = """
                SELECT "userId", embedding
                FROM user_content_embeddings
                WHERE "userId" = ANY(%s::uuid[])
            """
            emb_results = db.execute_query(emb_query, (candidate_user_ids,))
            
            user_embeddings = {}
            for row in emb_results:
                user_id = str(row['userId'])
                emb_data = row['embedding']
                if emb_data:
                    if isinstance(emb_data, list):
                        user_embeddings[user_id] = np.array(emb_data, dtype=np.float32)
                    elif isinstance(emb_data, str):
                        import json
                        user_embeddings[user_id] = np.array(json.loads(emb_data), dtype=np.float32)
                    else:
                        user_embeddings[user_id] = np.array(emb_data, dtype=np.float32)
            
            # OPTIMIZATION 4: Batch load CF factors
            cf_query = """
                SELECT "userId", factors
                FROM user_cf_factors
                WHERE "userId" = ANY(%s::uuid[])
            """
            cf_results = db.execute_query(cf_query, (candidate_user_ids,))
            
            user_cf_factors = {}
            for row in cf_results:
                user_id = str(row['userId'])
                factors_data = row['factors']
                if factors_data:
                    if isinstance(factors_data, list):
                        user_cf_factors[user_id] = np.array(factors_data, dtype=np.float32)
                    elif isinstance(factors_data, str):
                        import json
                        user_cf_factors[user_id] = np.array(json.loads(factors_data), dtype=np.float32)
                    else:
                        user_cf_factors[user_id] = np.array(factors_data, dtype=np.float32)
            
            # OPTIMIZATION 5: Vectorized scoring (process all at once)
            scored_candidates = []
            
            for user_id in candidate_user_ids:
                try:
                    user_emb = user_embeddings.get(user_id)
                    user_cf = user_cf_factors.get(user_id)
                    
                    # Skip if no embedding
                    if user_emb is None:
                        continue
                    
                    # Content-based score (cosine similarity)
                    content_score = float(np.dot(job_emb, user_emb) / (job_emb_norm * np.linalg.norm(user_emb)))
                    
                    # Collaborative filtering score
                    if job_cf is not None and user_cf is not None:
                        cf_score = float(np.dot(job_cf, user_cf))
                    else:
                        cf_score = 0.0
                    
                    # Hybrid combination
                    final_score = self.alpha * content_score + (1 - self.alpha) * cf_score
                    
                    # Apply minimum score threshold
                    if min_score is not None and final_score < min_score:
                        continue
                    
                    scored_candidates.append((user_id, final_score))
                except Exception as e:
                    logger.error(f"Error scoring candidate {user_id}: {e}")
                    continue
            
            # Sort by score (descending)
            scored_candidates.sort(key=lambda x: x[1], reverse=True)
            
            # Return top N
            top_candidates = scored_candidates[:limit]
            top_user_ids = [user_id for user_id, _ in top_candidates]
            top_scores = [score for _, score in top_candidates]
            
            logger.info(f"Generated {len(top_user_ids)} candidate recommendations for job {job_id}")
            return top_user_ids, top_scores
            
        except Exception as e:
            logger.error(f"Error getting candidate recommendations for {job_id}: {e}", exc_info=True)
            return [], []

    def get_search_recommendations(self, request: RecommendationRequest) -> Tuple[List[str], List[float]]:
        """
        Get job recommendations using ML (embeddings + CF) with search filters applied.
        Falls back to semantic search if no results.
        """
        try:
            # First, get candidate jobs with all filters applied (including searchTerm, skillsLike, etc.)
            candidate_job_ids = self.get_candidate_jobs_optimized(
                request.userId, 
                request.preferences,
            )
            
            if not candidate_job_ids:
                logger.warning(f"No candidate jobs found for user {request.userId} with search filters - trying semantic search")
                return self._semantic_search_fallback(request)
            
            # Limit candidates for performance
            if len(candidate_job_ids) > 500:
                candidate_job_ids = candidate_job_ids[:500]
            
            # Load user embedding and CF factors for ML-based scoring
            logger.info(f"Loading embeddings and CF factors for {len(candidate_job_ids)} jobs")
            
            user_emb = embedding_service.get_user_embedding(request.userId)
            user_cf = cf_service.get_user_cf_factors(request.userId)

            if user_emb is None:
                logger.warning(f"User {request.userId} has no embedding - trying semantic search fallback")
                return self._semantic_search_fallback(request)
            
            if user_cf is None:
                logger.warning(f"User {request.userId} has no CF factors in database")

            # Batch load all job embeddings
            job_embeddings = {}
            job_cf_factors = {}
            
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
            
            # Score each candidate using ML (embeddings + CF)
            scored_jobs = []
            user_emb_norm = np.linalg.norm(user_emb) if user_emb is not None else 1.0
            
            for job_id in candidate_job_ids:
                try:
                    job_emb = job_embeddings.get(job_id)
                    job_cf = job_cf_factors.get(job_id)
                    
                    # Content-based score (cosine similarity)
                    if job_emb is not None:
                        content_score = float(np.dot(user_emb, job_emb) / (user_emb_norm * np.linalg.norm(job_emb)))
                    else:
                        content_score = 0.0

                    # Collaborative filtering score
                    if user_cf is not None and job_cf is not None:
                        cf_score = float(np.dot(user_cf, job_cf))
                    else:
                        cf_score = 0.0

                    # Hybrid combination (same as get_recommendations)
                    final_score = self.alpha * content_score + (1 - self.alpha) * cf_score
                    
                    scored_jobs.append((job_id, final_score))
                except Exception as e:
                    logger.error(f"Error scoring job {job_id}: {e}")
                    continue
            
            # Apply preference boosts (location, role type, company size, etc.)
            scored_jobs = self.apply_preference_boosts(scored_jobs, request.preferences)
                                    
            # Sort by score (descending)
            scored_jobs.sort(key=lambda x: x[1], reverse=True)
            
            # Return top N
            top_jobs = scored_jobs[:request.limit]
            top_job_ids = [job_id for job_id, _ in top_jobs]
            top_scores = [score for _, score in top_jobs]
            
            # Fallback to semantic search if results are empty or insufficient
            if not top_job_ids or len(top_job_ids) < request.limit:
                logger.info(f"Only {len(top_job_ids)} recommendations found, using semantic search to fill remaining slots")
                semantic_jobs, semantic_scores = self._semantic_search_fallback(
                    request, 
                    exclude_job_ids=top_job_ids,
                    needed=request.limit - len(top_job_ids)
                )
                if semantic_jobs:
                    top_job_ids.extend(semantic_jobs)
                    top_scores.extend(semantic_scores)
                    logger.info(f"Added {len(semantic_jobs)} jobs from semantic search")
            
            logger.info(f"Generated {len(top_job_ids)} ML-based search recommendations for user {request.userId}")
            return top_job_ids, top_scores
            
        except Exception as e:
            logger.error(f"Error in get_search_recommendations: {e}", exc_info=True)
            # Final fallback to semantic search
            return self._semantic_search_fallback(request)

    def _semantic_search_fallback(
        self,
        request: RecommendationRequest,
        exclude_job_ids: List[str] = None,
        needed: int = None
    ) -> Tuple[List[str], List[float]]:
        """
        Semantic search fallback using embedding similarity.
        Generates query embedding and finds similar jobs.
        """
        try:
            # Build search query from searchTerm and preferences
            query_parts = []
            
            if request.searchTerm:
                query_parts.append(request.searchTerm)
            
            if request.preferences:
                if request.preferences.skillsLike:
                    query_parts.extend(request.preferences.skillsLike)
                if request.preferences.preferredLocations:
                    query_parts.extend(request.preferences.preferredLocations)
                if request.preferences.preferredRoleTypes:
                    query_parts.extend(request.preferences.preferredRoleTypes)
            
            # If no query, use a generic job search
            if not query_parts:
                query_text = "job opportunities"
            else:
                query_text = " ".join(query_parts)
            
            logger.info(f"Semantic search fallback with query: {query_text}")
            
            # Generate embedding for the query
            query_embedding = embedding_service.encode_text(query_text)
            
            if query_embedding is None or np.all(query_embedding == 0):
                logger.warning("Failed to generate query embedding for semantic search")
                return [], []
            
            # Get all active jobs with their embeddings, applying filters
            base_query = """
                SELECT j.id, jce.embedding
                FROM jobs j
                LEFT JOIN job_content_embeddings jce ON j.id = jce."jobId"
                WHERE j.status = 'active'
                AND (j."deletedAt" IS NULL OR j."deletedAt" > NOW())
                AND jce.embedding IS NOT NULL
            """
            params = []
            
            # Exclude already recommended jobs
            if exclude_job_ids:
                placeholders = ','.join(['%s'] * len(exclude_job_ids))
                base_query += f" AND j.id NOT IN ({placeholders})"
                params.extend(exclude_job_ids)
            
            # Apply preference filters
            if request.preferences:
                if request.preferences.hiddenCompanyIds:
                    base_query += " AND j.\"organizationId\" != ALL(%s)"
                    params.append(request.preferences.hiddenCompanyIds)
                
                if request.preferences.preferredLocations:
                    base_query += " AND j.location = ANY(%s)"
                    params.append(request.preferences.preferredLocations)
                
                if request.preferences.minSalary:
                    base_query += " AND (j.\"salaryDetails\"->>'minAmount')::int >= %s"
                    params.append(request.preferences.minSalary)
                
                if request.preferences.preferredRoleTypes:
                    # Cast enum to text for comparison
                    base_query += " AND j.type::text = ANY(%s)"
                    params.append(request.preferences.preferredRoleTypes)
            
            # Limit for performance (get more candidates than needed for better results)
            limit = needed if needed else request.limit
            base_query += f" LIMIT %s"
            params.append(min(limit * 3, 1000))  # Get 3x more for better selection
            
            # Execute query
            results = db.execute_query(base_query, tuple(params) if params else None)
            
            if not results:
                logger.warning("No jobs found for semantic search")
                return [], []
            
            # Compute similarity scores
            scored_jobs = []
            query_norm = np.linalg.norm(query_embedding)
            
            for row in results:
                job_id = str(row['id'])
                emb_data = row['embedding']
                
                if not emb_data:
                    continue
                
                try:
                    # Parse embedding
                    if isinstance(emb_data, list):
                        job_emb = np.array(emb_data, dtype=np.float32)
                    elif isinstance(emb_data, str):
                        import json
                        job_emb = np.array(json.loads(emb_data), dtype=np.float32)
                    else:
                        job_emb = np.array(emb_data, dtype=np.float32)
                    
                    # Compute cosine similarity
                    similarity = float(np.dot(query_embedding, job_emb) / (query_norm * np.linalg.norm(job_emb)))
                    
                    # Filter by minimum similarity threshold
                    if similarity >= 0.3:  # Minimum similarity threshold
                        scored_jobs.append((job_id, similarity))
                except Exception as e:
                    logger.error(f"Error computing similarity for job {job_id}: {e}")
                    continue
            
            # Sort by similarity (descending)
            scored_jobs.sort(key=lambda x: x[1], reverse=True)
            
            # Apply preference boosts
            scored_jobs = self.apply_preference_boosts(scored_jobs, request.preferences)
            
            # Re-sort after boosts
            scored_jobs.sort(key=lambda x: x[1], reverse=True)
            
            # Return top N
            top_jobs = scored_jobs[:limit]
            top_job_ids = [job_id for job_id, _ in top_jobs]
            top_scores = [score for _, score in top_jobs]
            
            logger.info(f"Semantic search returned {len(top_job_ids)} jobs")
            return top_job_ids, top_scores
            
        except Exception as e:
            logger.error(f"Error in semantic search fallback: {e}", exc_info=True)
            return [], []
        
    # Optimized version using PostgreSQL array
    def batch_load_embeddings(self, job_ids: List[str]) -> dict[str, np.ndarray]:
        """Optimized batch loading using array parameters"""
        if not job_ids:
            return {}
        
        # Use PostgreSQL array parameter (more efficient than IN clause)
        query = """
            SELECT "jobId", embedding
            FROM job_content_embeddings
            WHERE "jobId" = ANY(%s::uuid[])
        """
        
        results = db.execute_query(query, (job_ids,))
        
        embeddings = {}
        for row in results:
            job_id = str(row['jobId'])
            emb_data = row['embedding']
            if emb_data:
                if isinstance(emb_data, list):
                    embeddings[job_id] = np.array(emb_data, dtype=np.float32)
                elif isinstance(emb_data, str):
                    import json
                    embeddings[job_id] = np.array(json.loads(emb_data), dtype=np.float32)
                else:
                    embeddings[job_id] = np.array(emb_data, dtype=np.float32)
        
        return embeddings
recommendation_service = RecommendationService()