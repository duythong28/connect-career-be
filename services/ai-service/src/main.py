from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
import logging
from .config import settings
from .models.schemas import (
    RecommendationRequest,
    RecommendationResponse,
    HealthResponse,
)
from .services.recommendation_service import recommendation_service

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
import numpy as np

@v1_router.post("/embeddings/job")
async def generate_job_embedding(job_data: dict):
    """Generate embedding for a single job"""
    try:
        job_id = job_data.get('jobId')
        if not job_id:
            raise HTTPException(status_code=400, detail="jobId is required")
        
        # Build job text (reuse logic from train_embeddings.py)
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
        parts = []
        
        if user_data.get('skills'):
            skills = user_data['skills']
            if isinstance(skills, list):
                parts.append("Skills: " + ", ".join(skills))
        
        if user_data.get('languages'):
            languages = user_data['languages']
            if isinstance(languages, list):
                parts.append("Languages: " + ", ".join(languages))
        
        if user_data.get('workExperiences'):
            exp_parts = []
            for exp in user_data['workExperiences']:
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
        
        if user_data.get('preferences'):
            pref = user_data['preferences']
            if pref.get('skillsLike'):
                parts.append("Preferred Skills: " + ", ".join(pref['skillsLike']))
            if pref.get('preferredLocations'):
                parts.append("Preferred Locations: " + ", ".join(pref['preferredLocations']))
            if pref.get('preferredRoleTypes'):
                parts.append("Preferred Roles: " + ", ".join(pref['preferredRoleTypes']))
            if pref.get('industriesLike'):
                parts.append("Preferred Industries: " + ", ".join(pref['industriesLike']))
        
        if user_data.get('recentInteractions'):
            interaction_parts = []
            for inter in user_data['recentInteractions'][:5]:
                if inter.get('jobTitle'):
                    interaction_parts.append(inter['jobTitle'])
            if interaction_parts:
                parts.append("Recent Interests: " + " | ".join(interaction_parts))
        
        user_text = "\n".join(filter(None, parts))
        
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
    from .scripts.train_embeddings import train_job_embeddings, train_user_embeddings
    
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
    # This would call your CF training script
    # For now, return success - implement based on your CF training logic
    return {"status": "success", "message": "CF training queued"}

@v1_router.post("/recommendations", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    """Get job recommendations for a user"""
    try:
        job_ids, scores = recommendation_service.get_recommendations(request)
        return RecommendationResponse(jobIds=job_ids, scores=scores)
    except Exception as e:
        logger.error(f"Error generating recommendations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# Include v1 router under api router
api_router.include_router(v1_router)

# Include api router in main app
app.include_router(api_router)

# Health check (no versioning - common practice)
@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint"""
    return HealthResponse(status="ok", version=settings.app_version)


# Root endpoint (no versioning)
@app.get("/")
async def root():
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "api_version": "v1",
        "endpoints": {
            "health": "/health",
            "recommendations": "/api/v1/recommendations"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)