import logging
import re
import asyncio
from typing import Dict, List, Tuple
from ..models.schemas import (
    MatchingScoreRequest,
    MatchingScoreResponse,
    MatchingScoreBreakdown,
    MatchingScoreExplanation,
    MatchingScoreDetails,
)
from ..services.llm_service import llm_service
from ..services.embedding_service import embedding_service
logger = logging.getLogger(__name__)


class MatchingScoreService:
    """Service to calculate matching scores between job and candidate using AI-enhanced analysis"""

    def __init__(self):
        # Weights for different matching factors
        self.skills_weight = 0.4
        self.experience_weight = 0.3
        self.education_weight = 0.15
        self.location_weight = 0.15

    async def calculate_matching_score(self, request: MatchingScoreRequest) -> MatchingScoreResponse:
        """Calculate comprehensive matching score using AI (Gemini)"""
        try:
            job = request.job
            cv_content = request.cv.content
            candidate_profile = request.candidateProfile
            
            # Convert job to dict if needed
            job_dict = job.__dict__ if hasattr(job, '__dict__') else {
                'title': getattr(job, 'title', ''),
                'summary': getattr(job, 'summary', ''),
                'description': getattr(job, 'description', ''),
                'location': getattr(job, 'location', ''),
                'requirements': getattr(job, 'requirements', []),
                'keywords': getattr(job, 'keywords', []),
                'seniorityLevel': getattr(job, 'seniorityLevel', ''),
                'type': getattr(job, 'type', ''),
            }
            
            # Convert candidate profile to dict if needed
            profile_dict = None
            if candidate_profile:
                profile_dict = candidate_profile.__dict__ if hasattr(candidate_profile, '__dict__') else {
                    'skills': getattr(candidate_profile, 'skills', []),
                    'languages': getattr(candidate_profile, 'languages', []),
                }
            
            # Get complete analysis from Gemini
            result = await llm_service.calculate_complete_matching_score(
                job_dict,
                cv_content,
                profile_dict
            )
            
            # Build response objects
            breakdown = MatchingScoreBreakdown(
                skillsMatch=round(result['breakdown']['skillsMatch'], 2),
                experienceMatch=round(result['breakdown']['experienceMatch'], 2),
                educationMatch=round(result['breakdown']['educationMatch'], 2),
                locationMatch=round(result['breakdown']['locationMatch'], 2),
            )
            
            details = MatchingScoreDetails(
                matchedSkills=result['details']['matchedSkills'][:10],
                missingSkills=result['details']['missingSkills'][:10],
                yearsExperience=round(result['details']['yearsExperience'], 1),
                requiredExperience=round(result['details']['requiredExperience'], 1),
                educationLevel=result['details']['educationLevel'],
                requiredEducation=result['details']['requiredEducation'],
            )
            
            explanation = MatchingScoreExplanation(
                summary=result['explanation']['summary'],
                strengths=result['explanation']['strengths'],
                weaknesses=result['explanation']['weaknesses'],
                recommendations=result['explanation']['recommendations'],
            )
            
            return MatchingScoreResponse(
                overallScore=round(result['overallScore'], 2),
                breakdown=breakdown,
                explanation=explanation,
                details=details,
            )
            
        except Exception as e:
            logger.error(f"Error calculating matching score: {e}", exc_info=True)
            raise

    async def _calculate_skills_match_ai(
        self, 
        job_requirements: List[str], 
        cv_skills: List[str],
        cv_experience: List[Dict]
    ) -> Dict:
        """AI-driven skills matching using LLM + Embeddings"""
        if not job_requirements:
            return {"score": 1.0, "matchedSkills": [], "missingSkills": []}
        
        if not cv_skills:
            return {"score": 0.0, "matchedSkills": [], "missingSkills": []}

        job_text = " ".join(job_requirements)
        cv_text = " ".join(cv_skills)
        
        print('job_text', job_text)
        print('cv_text', cv_text)
        
        try:
            job_emb = embedding_service.encode_text(job_text)
            cv_emb = embedding_service.encode_text(cv_text)
            semantic_score = embedding_service.cosine_similarity(job_emb, cv_emb)
            print('semantic_score', semantic_score)
        except Exception as e:
            logger.warning(f"Embedding calculation failed: {e}")
            semantic_score = 0.0

        # 2. Use LLM for nuanced semantic analysis
        llm_result = await llm_service.analyze_skills_match(
            job_requirements, 
            cv_skills, 
            cv_experience
        )
        
        llm_score = llm_result.get('score', 0.0)
        llm_matched = llm_result.get('matchedSkills', [])
        llm_missing = llm_result.get('missingSkills', [])

        final_score = (semantic_score * 0.4) + (llm_score * 0.6)
        
        return {
            "score": round(min(final_score, 1.0), 2),
            "matchedSkills": llm_matched[:10] if llm_matched else [],
            "missingSkills": llm_missing[:10] if llm_missing else [],
        }

    def _extract_skills_from_cv(self, cv_content: Dict) -> List[str]:
        """Extract skills from CV content"""
        skills = []
        
        # Extract from skills field
        if 'skills' in cv_content:
            if isinstance(cv_content['skills'], list):
                skills.extend([s.lower().strip() for s in cv_content['skills']])
            elif isinstance(cv_content['skills'], dict):
                # Handle structured skills object
                for category, skill_list in cv_content['skills'].items():
                    if isinstance(skill_list, list):
                        skills.extend([s.lower().strip() for s in skill_list])

        # Extract from work experience
        if 'workExperience' in cv_content:
            for exp in cv_content['workExperience']:
                if 'skills' in exp and isinstance(exp['skills'], list):
                    skills.extend([s.lower().strip() for s in exp['skills']])
                if 'description' in exp:
                    # Extract skills from description text
                    desc_skills = self._extract_skills_from_text(exp['description'])
                    skills.extend(desc_skills)

        # Extract from education
        if 'education' in cv_content:
            for edu in cv_content['education']:
                if 'coursework' in edu and isinstance(edu['coursework'], list):
                    skills.extend([s.lower().strip() for s in edu['coursework']])

        # Remove duplicates and return
        return list(set(skills))

    def _extract_skills_from_text(self, text: str) -> List[str]:
        """Extract skill-like terms from text (basic implementation)"""
        if not text:
            return []
        
        # Common technical skills patterns
        skill_patterns = [
            r'\b(?:Python|Java|JavaScript|TypeScript|React|Angular|Vue|Node\.js|Django|Flask|Spring|Laravel)\b',
            r'\b(?:SQL|NoSQL|MongoDB|PostgreSQL|MySQL|Redis)\b',
            r'\b(?:AWS|Azure|GCP|Docker|Kubernetes|CI/CD)\b',
            r'\b(?:Git|Agile|Scrum|DevOps|Microservices)\b',
        ]
        
        found_skills = []
        text_lower = text.lower()
        for pattern in skill_patterns:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            found_skills.extend(matches)
        
        return [s.lower() for s in found_skills]

    def _calculate_years_of_experience(self, work_experience: List[Dict]) -> float:
        """Calculate total years of experience from work history"""
        if not work_experience:
            return 0.0

        from datetime import datetime
        total_months = 0
        now = datetime.now()

        for exp in work_experience:
            if 'startDate' not in exp:
                continue

            try:
                start_date = self._parse_date(exp['startDate'])
                if not start_date:
                    continue

                if exp.get('current') or not exp.get('endDate') or exp.get('endDate', '').lower() == 'present':
                    end_date = now
                else:
                    end_date = self._parse_date(exp['endDate'])
                    if not end_date:
                        continue

                months = (end_date.year - start_date.year) * 12 + (end_date.month - start_date.month)
                if months > 0:
                    total_months += months

            except Exception as e:
                logger.warning(f"Error parsing experience date: {e}")
                continue

        return round(total_months / 12.0, 1)

    def _parse_date(self, date_str: str):
        """Parse date string to datetime object"""
        from datetime import datetime
        
        if not date_str:
            return None

        # Try common date formats
        formats = [
            '%Y-%m-%d',
            '%Y/%m/%d',
            '%m/%Y',
            '%Y-%m',
            '%Y',
        ]

        for fmt in formats:
            try:
                return datetime.strptime(date_str.strip(), fmt)
            except ValueError:
                continue

        return None

    def _extract_required_experience(self, requirements: List[str]) -> float:
        """Extract required years of experience from job requirements"""
        if not requirements:
            return 0.0

        # Patterns to match experience requirements
        experience_patterns = [
            r'(\d+)\+?\s*years?\s*(?:of\s*)?experience',
            r'(\d+)\+?\s*years?\s*(?:in|of)',
            r'minimum\s*(\d+)\s*years?',
            r'at\s*least\s*(\d+)\s*years?',
        ]

        for req in requirements:
            req_lower = req.lower()
            for pattern in experience_patterns:
                match = re.search(pattern, req_lower)
                if match:
                    try:
                        years = float(match.group(1))
                        return years
                    except ValueError:
                        continue

        return 0.0

    def _get_highest_education_level(self, education: List[Dict]) -> str:
        """Get the highest education level from education history"""
        if not education:
            return ''

        # Education level hierarchy
        level_hierarchy = {
            'phd': 5,
            'doctorate': 5,
            'master': 4,
            'mba': 4,
            'bachelor': 3,
            'degree': 3,
            'diploma': 2,
            'certificate': 1,
            'high school': 0,
        }

        highest_level = ''
        highest_rank = -1

        for edu in education:
            degree_type = (edu.get('degreeType') or '').lower()
            field = (edu.get('fieldOfStudy') or '').lower()
            institution = (edu.get('institutionName') or '').lower()

            # Check degree type
            for level, rank in level_hierarchy.items():
                if level in degree_type and rank > highest_rank:
                    highest_rank = rank
                    highest_level = edu.get('degreeType', '')
                    break

            # Check field of study for hints
            if not highest_level:
                for level, rank in level_hierarchy.items():
                    if level in field and rank > highest_rank:
                        highest_rank = rank
                        highest_level = edu.get('degreeType', '') or field
                        break

        return highest_level or 'Not specified'

    def _extract_required_education(self, requirements: List[str]) -> str:
        """Extract required education level from job requirements"""
        if not requirements:
            return ''

        education_keywords = {
            'phd': 'PhD',
            'doctorate': 'PhD',
            'master': 'Master',
            'mba': 'MBA',
            'bachelor': 'Bachelor',
            'degree': 'Degree',
        }

        for req in requirements:
            req_lower = req.lower()
            for keyword, level in education_keywords.items():
                if keyword in req_lower:
                    return level

        return ''
    def _calculate_skills_match(self, job_requirements: List[str], cv_skills: List[str]) -> float:
        """Calculate skills matching score (0-1)"""
        if not job_requirements:
            return 1.0  # No requirements means perfect match

        if not cv_skills:
            return 0.0

        # Extract skill keywords from requirements
        requirement_skills = set()
        for req in job_requirements:
            # Split by common delimiters and extract meaningful terms
            words = re.findall(r'\b\w+\b', req.lower())
            requirement_skills.update(words)

        # Match CV skills with requirements
        matched_count = 0
        for cv_skill in cv_skills:
            cv_skill_lower = cv_skill.lower()
            # Exact match
            if cv_skill_lower in requirement_skills:
                matched_count += 1
                continue
            # Partial match (skill contains requirement keyword or vice versa)
            for req_skill in requirement_skills:
                if len(req_skill) > 3:  # Only check meaningful words
                    if req_skill in cv_skill_lower or cv_skill_lower in req_skill:
                        matched_count += 1
                        break

        # Calculate score based on match ratio
        match_ratio = min(matched_count / len(requirement_skills), 1.0)
        
        # Boost score if candidate has many relevant skills
        if len(cv_skills) >= len(requirement_skills):
            match_ratio = min(match_ratio * 1.1, 1.0)

        return round(match_ratio, 2)

    def _calculate_experience_match(
        self, required_years: float, candidate_years: float
    ) -> float:
        """Calculate experience matching score (0-1)"""
        if required_years == 0:
            return 1.0  # No requirement means perfect match

        if candidate_years == 0:
            return 0.0

        if candidate_years >= required_years:
            return 1.0  # Meets or exceeds requirement

        # Linear scale for partial match
        ratio = candidate_years / required_years
        return round(min(ratio, 1.0), 2)

    def _calculate_education_match(
        self, candidate_education: str, required_education: str, requirements: List[str]
    ) -> float:
        """Calculate education matching score (0-1)"""
        if not required_education or required_education == 'Not specified':
            return 1.0  # No requirement means perfect match

        if not candidate_education or candidate_education == 'Not specified':
            return 0.5  # Partial score if education not specified

        # Education level hierarchy
        level_ranks = {
            'phd': 5,
            'doctorate': 5,
            'master': 4,
            'mba': 4,
            'bachelor': 3,
            'degree': 3,
            'diploma': 2,
            'certificate': 1,
        }

        candidate_rank = 0
        required_rank = 0

        candidate_lower = candidate_education.lower()
        required_lower = required_education.lower()

        for level, rank in level_ranks.items():
            if level in candidate_lower:
                candidate_rank = rank
            if level in required_lower:
                required_rank = rank

        if candidate_rank >= required_rank:
            return 1.0  # Meets or exceeds requirement

        # Partial score based on how close they are
        if required_rank > 0:
            ratio = candidate_rank / required_rank
            return round(max(ratio, 0.3), 2)  # Minimum 0.3 if some education exists

        return 0.5

    def _calculate_location_match(self, job_location: str, cv_content: Dict) -> float:
        """Calculate location matching score (0-1)"""
        if not job_location:
            return 1.0  # No location requirement means perfect match

        # Extract location from CV
        cv_location = ''
        if 'location' in cv_content:
            cv_location = str(cv_content['location']).lower()
        elif 'address' in cv_content:
            address = cv_content['address']
            if isinstance(address, dict):
                cv_location = str(address.get('city', '') + ' ' + address.get('country', '')).lower()
            else:
                cv_location = str(address).lower()

        if not cv_location:
            return 0.7  # Partial score if location not specified

        job_location_lower = job_location.lower()

        # Exact match
        if job_location_lower in cv_location or cv_location in job_location_lower:
            return 1.0

        # Check for city/country match
        job_parts = set(job_location_lower.split())
        cv_parts = set(cv_location.split())
        common_parts = job_parts.intersection(cv_parts)

        if common_parts:
            # Partial match based on common location words
            return round(len(common_parts) / max(len(job_parts), 1), 2)

        return 0.3  # Low score if no match

    def _get_skill_matches(
        self, job_requirements: List[str], cv_skills: List[str]
    ) -> Tuple[List[str], List[str]]:
        """Get matched and missing skills"""
        if not job_requirements:
            return [], []

        # Extract skill keywords from requirements
        requirement_skills = []
        for req in job_requirements:
            words = re.findall(r'\b\w{4,}\b', req.lower())  # Words with 4+ chars
            requirement_skills.extend(words)

        requirement_skills = list(set(requirement_skills))
        matched_skills = []
        missing_skills = []

        cv_skills_lower = [s.lower() for s in cv_skills]

        for req_skill in requirement_skills:
            found = False
            for cv_skill in cv_skills_lower:
                if req_skill in cv_skill or cv_skill in req_skill:
                    matched_skills.append(req_skill.title())
                    found = True
                    break
            if not found:
                missing_skills.append(req_skill.title())

        return matched_skills[:10], missing_skills[:10]  # Limit to top 10

    def _generate_explanation(
        self,
        overall_score: float,
        skills_match: float,
        experience_match: float,
        education_match: float,
        location_match: float,
        matched_skills: List[str],
        missing_skills: List[str],
        candidate_experience: float,
        required_experience: float,
        candidate_education: str,
        required_education: str,
        job,
        cv_content: Dict,
    ) -> MatchingScoreExplanation:
        """Generate AI-enhanced explanation of the matching score"""
        
        # Build summary
        score_category = 'excellent' if overall_score >= 0.8 else \
                        'good' if overall_score >= 0.6 else \
                        'moderate' if overall_score >= 0.4 else 'low'
        
        summary = f"This candidate has a {score_category} match ({overall_score:.0%}) with the job requirements. "
        
        if skills_match >= 0.7:
            summary += "The candidate demonstrates strong alignment with required skills. "
        elif skills_match >= 0.4:
            summary += "The candidate has some relevant skills but may need additional training. "
        else:
            summary += "The candidate lacks several key required skills. "
        
        if experience_match >= 0.8:
            summary += f"Experience level ({candidate_experience} years) meets or exceeds requirements ({required_experience} years). "
        elif experience_match >= 0.5:
            summary += f"Experience level ({candidate_experience} years) is close to requirements ({required_experience} years). "
        else:
            summary += f"Experience level ({candidate_experience} years) is below requirements ({required_experience} years). "

        # Build strengths
        strengths = []
        if skills_match >= 0.7:
            strengths.append(f"Strong skills match ({skills_match:.0%}) with {len(matched_skills)} relevant skills identified")
        if experience_match >= 0.8:
            strengths.append(f"Meets or exceeds experience requirements")
        if education_match >= 0.8:
            strengths.append(f"Education level meets requirements")
        if location_match >= 0.8:
            strengths.append("Location alignment")
        if not strengths:
            strengths.append("Candidate shows potential with basic qualifications")

        # Build weaknesses
        weaknesses = []
        if skills_match < 0.5:
            weaknesses.append(f"Limited skills match ({skills_match:.0%}) - missing {len(missing_skills)} key skills")
        if experience_match < 0.6:
            weaknesses.append(f"Experience gap: {candidate_experience} years vs {required_experience} years required")
        if education_match < 0.6:
            weaknesses.append(f"Education level may not fully meet requirements")
        if location_match < 0.5:
            weaknesses.append("Location mismatch may affect availability")

        # Build recommendations
        recommendations = []
        if skills_match < 0.7:
            recommendations.append(f"Consider providing training for missing skills: {', '.join(missing_skills[:3])}")
        if experience_match < 0.7:
            recommendations.append("Evaluate if candidate's potential and learning ability can compensate for experience gap")
        if overall_score < 0.6:
            recommendations.append("Consider additional screening or assessment to evaluate fit")
        if overall_score >= 0.7:
            recommendations.append("Candidate appears well-qualified - proceed with interview process")
        
        if not recommendations:
            recommendations.append("Review application details for final decision")

        return MatchingScoreExplanation(
            summary=summary.strip(),
            strengths=strengths,
            weaknesses=weaknesses,
            recommendations=recommendations,
        )


# Singleton instance
matching_score_service = MatchingScoreService()

