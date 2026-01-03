from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
import logging
import json
import asyncio
from concurrent.futures import ThreadPoolExecutor
from .config import settings
from .models.schemas import (
    RecommendationRequest,
    RecommendationResponse,
    HealthResponse,
    SimilarJobsRequest,
    SimilarJobsResponse,
    CandidateRecommendationRequest,
    CandidateRecommendationResponse,
    MatchingScoreRequest,
    MatchingScoreResponse,
)
from .services.recommendation_service import recommendation_service
from .services.embedding_service import embedding_service
from .services.matching_score_service import matching_score_service
from .database import db
import sys, pathlib
sys.path.append(str(pathlib.Path(__file__).parent.parent))
import os
from .utils.embedding_builders import build_job_text, build_user_text
# Setup logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API router with /api prefix
api_router = APIRouter(prefix="/api", tags=["api"])

# API v1 router
v1_router = APIRouter(prefix="/v1", tags=["v1"])

@v1_router.get("/cache/stats")
async def get_cache_stats():
    """Get embedding cache statistics"""
    from .services.embedding_cache import get_cache
    
    cache = get_cache()
    if cache:
        return cache.stats()
    return {"enabled": False, "message": "Cache not enabled"}

from fastapi import HTTPException
from .services.embedding_service import embedding_service
from .database import db
import json


@v1_router.post("/embeddings/encode")
async def encode_text(request: dict):
    """Encode text to embedding vector"""
    try:
        text = request.get('text')
        if not text:
            raise HTTPException(status_code=400, detail="text is required")
        
        # Generate embedding
        embedding = embedding_service.encode_text(text)
        
        return {"embedding": embedding.tolist()}
    except Exception as e:
        logger.error(f"Error encoding text: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@v1_router.post("/embeddings/job")
async def generate_job_embedding(job_data: dict):
    """Generate embedding for a single job"""
    try:
        job_id = job_data.get('jobId')
        if not job_id:
            raise HTTPException(status_code=400, detail="jobId is required")
        
        parts = []
        if job_data.get('title'):
            parts.append(job_data['title'])
        if job_data.get('summary'):
            parts.append(job_data['summary'])
        if job_data.get('description'):
            parts.append(job_data['description'])
        if job_data.get('location'):
            parts.append(f"Location: {job_data['location']}")
        if job_data.get('jobFunction'):
            parts.append(f"Job Function: {job_data['jobFunction']}")
        if job_data.get('seniorityLevel'):
            parts.append(f"Level: {job_data['seniorityLevel']}")
        if job_data.get('type'):
            parts.append(f"Type: {job_data['type']}")
        if job_data.get('requirements'):
            reqs = job_data['requirements']
            if isinstance(reqs, list):
                parts.append("Requirements: " + ", ".join(reqs))
        if job_data.get('keywords'):
            keywords = job_data['keywords']
            if isinstance(keywords, list):
                parts.append("Keywords: " + ", ".join(keywords))
        if job_data.get('organizationName'):
            parts.append(f"Company: {job_data['organizationName']}")
        if job_data.get('organizationShortDescription'):
            parts.append(f"Company Description: {job_data['organizationShortDescription']}")
        if job_data.get('organizationIndustry'):
            parts.append(f"Industry: {job_data['organizationIndustry']}")
        
        job_text = "\n".join(filter(None, parts))
        
        if not job_text.strip():
            raise HTTPException(status_code=400, detail="Job has no text content")
        
        # Generate embedding
        embedding = embedding_service.encode_text(job_text)
        
        # Upsert into database
        upsert_query = """
            INSERT INTO job_content_embeddings ("jobId", embedding)
            VALUES (%s, %s::jsonb)
            ON CONFLICT ("jobId") 
            DO UPDATE SET embedding = EXCLUDED.embedding
        """
        db.execute_update(upsert_query, (job_id, json.dumps(embedding.tolist())))
        
        return {"status": "success", "jobId": job_id}
    except Exception as e:
        logger.error(f"Error generating job embedding: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@v1_router.post("/embeddings/user")
async def generate_user_embedding(user_data: dict):
    """Generate embedding for a single user"""
    try:
        user_id = user_data.get('userId')
        if not user_id:
            raise HTTPException(status_code=400, detail="userId is required")
        
        # Build user text (reuse logic from train_embeddings.py)
        
        user_text = build_user_text(user_data)
        
        if not user_text.strip():
            raise HTTPException(status_code=400, detail="User has no profile data")
        
        # Generate embedding
        embedding = embedding_service.encode_text(user_text)
        
        # Upsert into database
        upsert_query = """
            INSERT INTO user_content_embeddings ("userId", embedding)
            VALUES (%s, %s::jsonb)
            ON CONFLICT ("userId") 
            DO UPDATE SET embedding = EXCLUDED.embedding
        """
        db.execute_update(upsert_query, (user_id, json.dumps(embedding.tolist())))
        
        return {"status": "success", "userId": user_id}
    except Exception as e:
        logger.error(f"Error generating user embedding: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@v1_router.post("/embeddings/batch")
async def batch_generate_embeddings(request: dict):
    """Trigger batch embedding generation (calls existing training script logic)"""
    from scripts.train_embeddings import train_job_embeddings, train_user_embeddings
    try:
        embed_type = request.get('type', 'jobs')
        
        if embed_type == 'jobs':
            train_job_embeddings()
        elif embed_type == 'users':
            train_user_embeddings()
        else:
            raise HTTPException(status_code=400, detail="type must be 'jobs' or 'users'")
        
        return {"status": "success", "type": embed_type}
    except Exception as e:
        logger.error(f"Error in batch embedding: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@v1_router.post("/cf/train")
async def train_cf_factors():
    """Trigger CF factors training"""
    from scripts.train_cf_factors import train_cf_factors as train_cf
    
    try:
        train_cf()
        return {"status": "success", "message": "CF training completed"}
    except Exception as e:
        logger.error(f"CF training failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

executor = ThreadPoolExecutor(max_workers=4)

@v1_router.post("/recommendations", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    """Get job recommendations for a user"""
    try:
        # Run CPU-intensive computation in thread pool
        loop = asyncio.get_event_loop()
        job_ids, scores = await loop.run_in_executor(
            executor,
            recommendation_service.get_recommendations,
            request
        )
        return RecommendationResponse(jobIds=job_ids, scores=scores)
    except Exception as e:
        logger.error(f"Error getting recommendations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    
@v1_router.post("/search/recommendations/")
async def get_search_recommendations(request: RecommendationRequest):
    """Get job recommendations with user preferences and search term"""
    try:
        loop = asyncio.get_event_loop()
        job_ids, scores = await loop.run_in_executor(
            executor,
            recommendation_service.get_search_recommendations,
            request
        )
        return RecommendationResponse(jobIds=job_ids, scores=scores)
    except Exception as e:
        logger.error(f"Error getting search recommendations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@v1_router.post("/embeddings/job/{job_id}")
async def generate_job_embedding_by_id(job_id: str):
    """Generate embedding for a job by fetching data from database"""
    try:
        # Fetch job data from database (same query as train_embeddings.py)
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
            WHERE j.id = %s
        """
        
        results = db.execute_query(query, (job_id,))
        if not results:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        
        job_row = results[0]
        
        # Build job text using the same logic
        job_text = build_job_text(dict(job_row))
        
        if not job_text.strip():
            raise HTTPException(status_code=400, detail="Job has no text content")
        
        # Generate embedding
        embedding = embedding_service.encode_text(job_text)
        
        # Upsert into database
        upsert_query = """
            INSERT INTO job_content_embeddings ("jobId", embedding)
            VALUES (%s, %s::jsonb)
            ON CONFLICT ("jobId") 
            DO UPDATE SET embedding = EXCLUDED.embedding
        """
        db.execute_update(upsert_query, (job_id, json.dumps(embedding.tolist())))
        
        return {
            "status": "success",
            "jobId": job_id,
            "message": f"Embedding generated and stored for job {job_id}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating job embedding for {job_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@v1_router.post("/embeddings/user/{user_id}")
async def generate_user_embedding_by_id(user_id: str):
    """Generate embedding for a user by fetching data from database"""
    try:
        # Fetch user profile data (same queries as train_embeddings.py)
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
        
        # Fetch recent job interactions
        interaction_query = """
            SELECT DISTINCT ON (j.title)
                j.title as job_title,
                ji."createdAt"
            FROM job_interactions ji
            JOIN jobs j ON j.id = ji."jobId"
            WHERE ji."userId" = %s
            AND ji.type IN ('save', 'favorite', 'apply')
            ORDER BY j.title, ji."createdAt" DESC
            LIMIT 5
        """
        interactions = db.execute_query(interaction_query, (user_id,))
        
        # Build user data dict
        user_data = {
            **profile_data,
            'work_experiences': [dict(exp) for exp in work_experiences],
            'educations': [dict(edu) for edu in educations],
            'skills_like': preferences.get('skillsLike'),
            'preferred_locations': preferences.get('preferredLocations'),
            'preferred_role_types': preferences.get('preferredRoleTypes'),
            'industries_like': preferences.get('industriesLike'),
            'recent_interactions': [dict(inter) for inter in interactions]
        }
        
        # Build user text using the same logic
        user_text = build_user_text(user_data)
        
        if not user_text.strip():
            raise HTTPException(status_code=400, detail="User has no profile data")
        
        # Generate embedding
        embedding = embedding_service.encode_text(user_text)
        
        # Upsert into database
        upsert_query = """
            INSERT INTO user_content_embeddings ("userId", embedding)
            VALUES (%s, %s::jsonb)
            ON CONFLICT ("userId") 
            DO UPDATE SET embedding = EXCLUDED.embedding
        """
        db.execute_update(upsert_query, (user_id, json.dumps(embedding.tolist())))
        
        return {
            "status": "success",
            "userId": user_id,
            "message": f"Embedding generated and stored for user {user_id}"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating user embedding for {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@v1_router.post("/jobs/{job_id}/similar", response_model=SimilarJobsResponse)
async def get_similar_jobs(job_id: str, request: SimilarJobsRequest = None):
    """Get similar jobs based on a job ID"""
    try:
        loop = asyncio.get_event_loop()
        job_ids, scores = await loop.run_in_executor(
            executor,
            recommendation_service.get_similar_jobs,
            job_id,
            request.limit,
            request.excludeJobId
        )
        return SimilarJobsResponse(jobIds=job_ids, scores=scores)
    except Exception as e:
        logger.error(f"Error getting similar jobs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    
@v1_router.post("/jobs/{job_id}/candidates", response_model=CandidateRecommendationResponse)
async def get_candidate_recommendations(
    job_id: str,
    request: CandidateRecommendationRequest = None
):
    """Get candidate recommendations for a job (recruiter side)"""
    try:
        # If request body is provided, use it; otherwise use defaults
        if request is None:
            limit = 20
            exclude_applied = True
            min_score = None
        else:
            limit = request.limit
            exclude_applied = request.excludeApplied
            min_score = request.minScore
        
        # Run CPU-intensive computation in thread pool
        loop = asyncio.get_event_loop()
        user_ids, scores = await loop.run_in_executor(
            executor,
            recommendation_service.get_candidate_recommendations,
            job_id,
            limit,
            exclude_applied,
            min_score
        )
        return CandidateRecommendationResponse(userIds=user_ids, scores=scores)
    except Exception as e:
        logger.error(f"Error getting candidate recommendations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@v1_router.post("/matching-score/calculate", response_model=MatchingScoreResponse)
async def calculate_matching_score(request: MatchingScoreRequest):
    """Calculate AI-enhanced matching score between job and candidate"""
    try:
        result = await matching_score_service.calculate_matching_score(request)
        return result
    except Exception as e:
        logger.error(f"Error calculating matching score: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

# Register routers
api_router.include_router(v1_router)
app.include_router(api_router)

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(status="healthy", version=settings.app_version)

@app.on_event("startup")
async def startup_event():
    """Initialize heavy services on startup (non-blocking)"""
    import asyncio
    
    async def init_services():
        logger.info("Initializing services...")
        pass
    
    asyncio.create_task(init_services())
    logger.info("Server starting...")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
