# services/ai-service/src/services/llm_service.py
import logging
import os
from typing import List, Dict, Optional
from google import genai
from google.genai import types
from ..config import settings

logger = logging.getLogger(__name__)

class LLMService:
    """Service for LLM-based text analysis and generation"""
    
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if api_key:
            self.client = genai.Client(api_key=api_key)
            self.model = "gemini-2.5-flash"
            self.enabled = True
        else:
            logger.warning("No LLM API key found - LLM features disabled")
            self.enabled = False
    
    async def analyze_skills_match(
        self, 
        job_requirements: List[str], 
        cv_skills: List[str],
        cv_experience: List[Dict]
    ) -> Dict:
        """Use LLM to semantically analyze skills matching"""
        if not self.enabled:
            return {"score": 0.0, "matchedSkills": [], "missingSkills": [], "reasoning": ""}
        
        prompt = f"""Analyze the match between job requirements and candidate skills.

Job Requirements:
{chr(10).join(f"- {req}" for req in job_requirements)}

Candidate Skills:
{chr(10).join(f"- {skill}" for skill in cv_skills)}

Candidate Experience Summary:
{self._format_experience(cv_experience)}

Provide a JSON response with:
{{
    "score": <0.0-1.0>,
    "matchedSkills": ["skill1", "skill2"],
    "missingSkills": ["skill1", "skill2"],
    "reasoning": "explanation of the match"
}}

Consider semantic similarity (e.g., "React" matches "React.js", "JavaScript" relates to "TypeScript").
Be strict but fair - consider transferable skills."""
        
        try:
            # Use the correct API: client.models.generate_content()
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.3,
                    response_mime_type="application/json"
                )
            )
            
            # Extract text from response - handle different response structures
            if hasattr(response, 'text'):
                response_text = response.text
            elif hasattr(response, 'candidates') and response.candidates:
                response_text = response.candidates[0].content.parts[0].text
            elif hasattr(response, 'content'):
                response_text = response.content if isinstance(response.content, str) else str(response.content)
            else:
                response_text = str(response)
            
            # Parse JSON from response
            import json
            import re
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group())
                return {
                    "score": float(parsed.get("score", 0.0)),
                    "matchedSkills": parsed.get("matchedSkills", parsed.get("matched", [])),
                    "missingSkills": parsed.get("missingSkills", parsed.get("missing", [])),
                    "reasoning": parsed.get("reasoning", "")
                }
            return {"score": 0.0, "matchedSkills": [], "missingSkills": [], "reasoning": response_text}
        except Exception as e:
            logger.error(f"LLM skills analysis failed: {e}", exc_info=True)
            return {"score": 0.0, "matchedSkills": [], "missingSkills": [], "reasoning": ""}
    
    async def generate_matching_explanation(
        self,
        overall_score: float,
        breakdown: Dict,
        job: Dict,
        cv_content: Dict,
        matched_skills: List[str],
        missing_skills: List[str]
    ) -> Dict:
        """Generate AI-powered explanation of matching score"""
        if not self.enabled:
            return self._fallback_explanation(overall_score, breakdown)
        
        prompt = f"""Generate a professional, insightful explanation of why a candidate matches a job.

Overall Match Score: {overall_score:.0%}

Score Breakdown:
- Skills Match: {breakdown['skillsMatch']:.0%}
- Experience Match: {breakdown['experienceMatch']:.0%}
- Education Match: {breakdown['educationMatch']:.0%}
- Location Match: {breakdown['locationMatch']:.0%}

Job Title: {job.get('title', 'N/A')}
Job Requirements: {', '.join(job.get('requirements', [])[:5])}

Candidate Matched Skills: {', '.join(matched_skills[:10])}
Candidate Missing Skills: {', '.join(missing_skills[:10])}

Provide a JSON response:
{{
    "summary": "2-3 sentence overview",
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"],
    "recommendations": ["rec1", "rec2"]
}}

Be specific, actionable, and professional."""
        
        try:
            # Use the correct API: client.models.generate_content()
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    response_mime_type="application/json"
                )
            )
            
            # Extract text from response - handle different response structures
            if hasattr(response, 'text'):
                response_text = response.text
            elif hasattr(response, 'candidates') and response.candidates:
                response_text = response.candidates[0].content.parts[0].text
            elif hasattr(response, 'content'):
                response_text = response.content if isinstance(response.content, str) else str(response.content)
            else:
                response_text = str(response)
            
            import json
            import re
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group())
                return {
                    "summary": parsed.get("summary", ""),
                    "strengths": parsed.get("strengths", []),
                    "weaknesses": parsed.get("weaknesses", []),
                    "recommendations": parsed.get("recommendations", [])
                }
            return self._fallback_explanation(overall_score, breakdown)
        except Exception as e:
            logger.error(f"LLM explanation generation failed: {e}", exc_info=True)
            return self._fallback_explanation(overall_score, breakdown)
    
    def _format_experience(self, experience: List[Dict]) -> str:
        """Format work experience for LLM"""
        if not experience:
            return "No experience listed"
        summaries = []
        for exp in experience[:3]:  # Top 3
            title = exp.get('jobTitle', 'N/A')
            company = exp.get('company', 'N/A')
            duration = f"{exp.get('startDate', '')} - {exp.get('endDate', 'Present')}"
            summaries.append(f"{title} at {company} ({duration})")
        return "\n".join(summaries)
    
    def _fallback_explanation(self, score: float, breakdown: Dict) -> Dict:
        """Fallback explanation if LLM fails"""
        return {
            "summary": f"Match score: {score:.0%}",
            "strengths": [],
            "weaknesses": [],
            "recommendations": []
        }
    async def calculate_complete_matching_score(
    self,
    job: Dict,
    cv_content: Dict,
    candidate_profile: Optional[Dict] = None
) -> Dict:
        """Send all content to Gemini and get complete matching score analysis"""
        if not self.enabled:
            return self._get_fallback_matching_score()
        
        # Format all content for Gemini
        job_text = self._format_job_for_llm(job)
        cv_text = self._format_cv_for_llm(cv_content)
        profile_text = self._format_profile_for_llm(candidate_profile) if candidate_profile else "No additional profile information."
        
        prompt = f"""You are an expert recruiter analyzing the match between a job posting and a candidate's CV.

    JOB POSTING:
    {job_text}

    CANDIDATE CV:
    {cv_text}

    CANDIDATE PROFILE:
    {profile_text}

    Analyze the complete match and provide a comprehensive assessment. Consider:
    1. Skills match (semantic similarity, not just exact keywords)
    2. Experience level and relevance
    3. Education requirements
    4. Location compatibility
    5. Overall fit and potential

    Provide your analysis in the following JSON format:
    {{
        "overallScore": <0.0-1.0>,
        "breakdown": {{
            "skillsMatch": <0.0-1.0>,
            "experienceMatch": <0.0-1.0>,
            "educationMatch": <0.0-1.0>,
            "locationMatch": <0.0-1.0>
        }},
        "details": {{
            "matchedSkills": ["skill1", "skill2", ...],
            "missingSkills": ["skill1", "skill2", ...],
            "yearsExperience": <number>,
            "requiredExperience": <number>,
            "educationLevel": "<highest education>",
            "requiredEducation": "<required education>"
        }},
        "explanation": {{
            "summary": "2-3 sentence overview of the match",
            "strengths": ["strength1", "strength2", ...],
            "weaknesses": ["weakness1", "weakness2", ...],
            "recommendations": ["recommendation1", "recommendation2", ...]
        }}
    }}

    Be thorough, fair, and professional. Consider transferable skills and potential."""
        
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.3,
                    response_mime_type="application/json"
                )
            )
            
            # Extract text from response
            if hasattr(response, 'text'):
                response_text = response.text
            elif hasattr(response, 'candidates') and response.candidates:
                response_text = response.candidates[0].content.parts[0].text
            elif hasattr(response, 'content'):
                response_text = response.content if isinstance(response.content, str) else str(response.content)
            else:
                response_text = str(response)
            
            # Parse JSON
            import json
            import re
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group())
                return self._normalize_matching_response(parsed)
            
            logger.warning("Failed to parse JSON from LLM response")
            return self._get_fallback_matching_score()
            
        except Exception as e:
            logger.error(f"LLM matching score calculation failed: {e}", exc_info=True)
            return self._get_fallback_matching_score()
    
    def _format_job_for_llm(self, job: Dict) -> str:
        """Format job data for LLM"""
        parts = []
        if job.get('title'):
            parts.append(f"Title: {job['title']}")
        if job.get('summary'):
            parts.append(f"Summary: {job['summary']}")
        if job.get('description'):
            parts.append(f"Description: {job['description']}")
        if job.get('location'):
            parts.append(f"Location: {job['location']}")
        if job.get('requirements'):
            reqs = job['requirements']
            if isinstance(reqs, list):
                parts.append(f"Requirements:\n" + "\n".join(f"- {req}" for req in reqs))
            else:
                parts.append(f"Requirements: {reqs}")
        if job.get('keywords'):
            keywords = job['keywords']
            if isinstance(keywords, list):
                parts.append(f"Keywords: {', '.join(keywords)}")
        if job.get('seniorityLevel'):
            parts.append(f"Seniority Level: {job['seniorityLevel']}")
        if job.get('type'):
            parts.append(f"Job Type: {job['type']}")
        return "\n\n".join(parts)

    def _format_cv_for_llm(self, cv_content: Dict) -> str:
        """Format CV content for LLM"""
        parts = []
        
        # Personal info
        if cv_content.get('fullName'):
            parts.append(f"Name: {cv_content['fullName']}")
        if cv_content.get('email'):
            parts.append(f"Email: {cv_content['email']}")
        if cv_content.get('phone'):
            parts.append(f"Phone: {cv_content['phone']}")
        if cv_content.get('location'):
            parts.append(f"Location: {cv_content['location']}")
        if cv_content.get('address'):
            address = cv_content['address']
            if isinstance(address, dict):
                parts.append(f"Address: {address.get('city', '')}, {address.get('country', '')}")
            else:
                parts.append(f"Address: {address}")
        
        # Skills
        if cv_content.get('skills'):
            skills = cv_content['skills']
            if isinstance(skills, list):
                parts.append(f"Skills: {', '.join(skills)}")
            elif isinstance(skills, dict):
                skill_list = []
                for category, skill_list_val in skills.items():
                    if isinstance(skill_list_val, list):
                        skill_list.extend(skill_list_val)
                parts.append(f"Skills: {', '.join(skill_list)}")
        
        # Work Experience
        if cv_content.get('workExperience'):
            parts.append("\nWork Experience:")
            for exp in cv_content['workExperience']:
                exp_parts = []
                if exp.get('jobTitle'):
                    exp_parts.append(f"Title: {exp['jobTitle']}")
                if exp.get('company'):
                    exp_parts.append(f"Company: {exp['company']}")
                if exp.get('startDate'):
                    exp_parts.append(f"Start: {exp['startDate']}")
                if exp.get('endDate'):
                    exp_parts.append(f"End: {exp['endDate']}")
                if exp.get('current'):
                    exp_parts.append("Current: Yes")
                if exp.get('description'):
                    exp_parts.append(f"Description: {exp['description']}")
                if exp.get('skills'):
                    exp_skills = exp['skills']
                    if isinstance(exp_skills, list):
                        exp_parts.append(f"Skills: {', '.join(exp_skills)}")
                parts.append("\n".join(exp_parts))
        
        # Education
        if cv_content.get('education'):
            parts.append("\nEducation:")
            for edu in cv_content['education']:
                edu_parts = []
                if edu.get('degreeType'):
                    edu_parts.append(f"Degree: {edu['degreeType']}")
                if edu.get('fieldOfStudy'):
                    edu_parts.append(f"Field: {edu['fieldOfStudy']}")
                if edu.get('institutionName'):
                    edu_parts.append(f"Institution: {edu['institutionName']}")
                if edu.get('graduationDate'):
                    edu_parts.append(f"Graduated: {edu['graduationDate']}")
                if edu.get('coursework'):
                    coursework = edu['coursework']
                    if isinstance(coursework, list):
                        edu_parts.append(f"Coursework: {', '.join(coursework)}")
                parts.append("\n".join(edu_parts))
        
        # Languages
        if cv_content.get('languages'):
            languages = cv_content['languages']
            if isinstance(languages, list):
                parts.append(f"Languages: {', '.join(languages)}")
        
        return "\n\n".join(parts)

    def _format_profile_for_llm(self, profile: Dict) -> str:
        """Format candidate profile for LLM"""
        parts = []
        if profile.get('skills'):
            skills = profile['skills']
            if isinstance(skills, list):
                parts.append(f"Profile Skills: {', '.join(skills)}")
        if profile.get('languages'):
            languages = profile['languages']
            if isinstance(languages, list):
                parts.append(f"Profile Languages: {', '.join(languages)}")
        return "\n".join(parts) if parts else "No additional profile information."

    def _normalize_matching_response(self, parsed: Dict) -> Dict:
        """Normalize LLM response to match expected format"""
        return {
            "overallScore": float(parsed.get("overallScore", 0.0)),
            "breakdown": {
                "skillsMatch": float(parsed.get("breakdown", {}).get("skillsMatch", 0.0)),
                "experienceMatch": float(parsed.get("breakdown", {}).get("experienceMatch", 0.0)),
                "educationMatch": float(parsed.get("breakdown", {}).get("educationMatch", 0.0)),
                "locationMatch": float(parsed.get("breakdown", {}).get("locationMatch", 0.0)),
            },
            "details": {
                "matchedSkills": parsed.get("details", {}).get("matchedSkills", []),
                "missingSkills": parsed.get("details", {}).get("missingSkills", []),
                "yearsExperience": float(parsed.get("details", {}).get("yearsExperience", 0.0)),
                "requiredExperience": float(parsed.get("details", {}).get("requiredExperience", 0.0)),
                "educationLevel": parsed.get("details", {}).get("educationLevel", "Not specified"),
                "requiredEducation": parsed.get("details", {}).get("requiredEducation", "Not specified"),
            },
            "explanation": {
                "summary": parsed.get("explanation", {}).get("summary", ""),
                "strengths": parsed.get("explanation", {}).get("strengths", []),
                "weaknesses": parsed.get("explanation", {}).get("weaknesses", []),
                "recommendations": parsed.get("explanation", {}).get("recommendations", []),
            }
        }

    def _get_fallback_matching_score(self) -> Dict:
        """Fallback response if LLM fails"""
        return {
            "overallScore": 0.0,
            "breakdown": {
                "skillsMatch": 0.0,
                "experienceMatch": 0.0,
                "educationMatch": 0.0,
                "locationMatch": 0.0,
            },
            "details": {
                "matchedSkills": [],
                "missingSkills": [],
                "yearsExperience": 0.0,
                "requiredExperience": 0.0,
                "educationLevel": "Not specified",
                "requiredEducation": "Not specified",
            },
            "explanation": {
                "summary": "Unable to analyze match at this time.",
                "strengths": [],
                "weaknesses": [],
                "recommendations": [],
            }
        }

# Singleton instance
llm_service = LLMService()