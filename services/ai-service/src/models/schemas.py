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
    minSalary: Optional[int] = None



class RecommendationRequest(BaseModel):
    userId: str
    preferences: Optional[UserPreferences] = None
    recentInteractions: List[Interaction] = []
    limit: int = 20
    searchTerm: Optional[str] = None


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

# Matching Score Calculation Schemas
class JobData(BaseModel):
    id: str
    title: Optional[str] = None
    description: Optional[str] = None
    summary: Optional[str] = None
    location: Optional[str] = None
    jobFunction: Optional[str] = None
    seniorityLevel: Optional[str] = None
    type: Optional[str] = None
    requirements: Optional[List[str]] = []
    keywords: Optional[List[str]] = []

class CVData(BaseModel):
    id: str
    content: dict

class CandidateProfileData(BaseModel):
    id: Optional[str] = None
    skills: Optional[List[str]] = []
    languages: Optional[List[str]] = []

class MatchingScoreRequest(BaseModel):
    applicationId: str
    job: JobData
    cv: CVData
    candidateProfile: Optional[CandidateProfileData] = None

class MatchingScoreBreakdown(BaseModel):
    skillsMatch: float
    experienceMatch: float
    educationMatch: float
    locationMatch: float

class MatchingScoreExplanation(BaseModel):
    summary: str
    strengths: List[str]
    weaknesses: List[str]
    recommendations: List[str]

class MatchingScoreDetails(BaseModel):
    matchedSkills: List[str]
    missingSkills: List[str]
    yearsExperience: float
    requiredExperience: float
    educationLevel: str
    requiredEducation: str

class MatchingScoreResponse(BaseModel):
    overallScore: float
    breakdown: MatchingScoreBreakdown
    explanation: MatchingScoreExplanation
    details: MatchingScoreDetails