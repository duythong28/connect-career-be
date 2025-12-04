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