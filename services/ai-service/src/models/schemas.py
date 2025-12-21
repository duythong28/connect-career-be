from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class Interaction(BaseModel):
    jobId: str
    type: str  # view, click, save, favorite, apply
    weight: float = 1.0
    createdAt: Optional[str] = None


class UserPreferences(BaseModel):
    values: Optional[List[str]] = None
    industriesLike: Optional[List[str]] = None
    industriesDislike: Optional[List[str]] = None
    skillsLike: Optional[List[str]] = None
    skillsDislike: Optional[List[str]] = None
    preferredRoleTypes: Optional[List[str]] = None
    preferredLocations: Optional[List[str]] = None
    preferredCompanySize: Optional[str] = None
    wantsClearanceRoles: bool = False
    hiddenCompanyIds: Optional[List[str]] = None
    minSalary: Optional[int] = None  # Added missing field


class RecommendationRequest(BaseModel):
    userId: str
    preferences: Optional[UserPreferences] = None
    recentInteractions: List[Interaction] = []
    limit: int = 20


class RecommendationResponse(BaseModel):
    jobIds: List[str]
    scores: Optional[List[float]] = None


class HealthResponse(BaseModel):
    status: str
    version: str
    
class SimilarJobsRequest(BaseModel):
    limit: int = 10
    excludeJobId: bool = True

class SimilarJobsResponse(BaseModel):
    jobIds: List[str]
    scores: List[float]

class CandidateRecommendationRequest(BaseModel):
    limit: int = 20
    excludeApplied: bool = True
    minScore: Optional[float] = None

class CandidateRecommendationResponse(BaseModel):
    userIds: List[str]
    scores: List[float]