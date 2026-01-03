"""Helper functions for building text representations for embeddings"""


def build_job_text(job_data: dict) -> str:
    """Build text representation of job for embedding"""
    parts = []
    
    # Basic job info
    if job_data.get('title'):
        parts.append(job_data['title'])
    
    if job_data.get('summary'):
        parts.append(job_data['summary'])
    
    if job_data.get('description'):
        parts.append(job_data['description'])
    
    if job_data.get('location'):
        parts.append(f"Location: {job_data['location']}")
    
    # Job details
    if job_data.get('jobFunction'):
        parts.append(f"Job Function: {job_data['jobFunction']}")
    
    if job_data.get('seniorityLevel'):
        parts.append(f"Level: {job_data['seniorityLevel']}")
    
    if job_data.get('type'):
        parts.append(f"Type: {job_data['type']}")
    
    # Requirements
    if job_data.get('requirements'):
        requirements = job_data['requirements']
        if isinstance(requirements, list):
            parts.append("Requirements: " + ", ".join(requirements))
        elif isinstance(requirements, str):
            parts.append(f"Requirements: {requirements}")
    
    # Keywords
    if job_data.get('keywords'):
        keywords = job_data['keywords']
        if isinstance(keywords, list):
            parts.append("Keywords: " + ", ".join(keywords))
    
    # Organization info (if available)
    if job_data.get('organization_name'):
        parts.append(f"Company: {job_data['organization_name']}")
    
    if job_data.get('organization_tagline'):
        parts.append(f"Company Tagline: {job_data['organization_tagline']}")
    
    if job_data.get('organization_short_description'):
        parts.append(f"Company Description: {job_data['organization_short_description']}")
    
    if job_data.get('organization_industry'):
        parts.append(f"Industry: {job_data['organization_industry']}")
    
    return "\n".join(filter(None, parts))


def build_user_text(user_data: dict) -> str:
    """Build text representation of user for embedding"""
    parts = []
    
    # Profile skills
    if user_data.get('skills'):
        skills = user_data['skills']
        if isinstance(skills, list):
            parts.append("Skills: " + ", ".join(skills))
        elif isinstance(skills, str):
            parts.append(f"Skills: {skills}")
    
    # Languages
    if user_data.get('languages'):
        languages = user_data['languages']
        if isinstance(languages, list):
            parts.append("Languages: " + ", ".join(languages))
    
    # Work experiences
    if user_data.get('work_experiences'):
        exp_parts = []
        for exp in user_data['work_experiences']:
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
    
    # Education
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
    
    # User preferences
    if user_data.get('skills_like'):
        skills_like = user_data['skills_like']
        if isinstance(skills_like, list):
            parts.append("Preferred Skills: " + ", ".join(skills_like))
    
    if user_data.get('preferred_locations'):
        locations = user_data['preferred_locations']
        if isinstance(locations, list):
            parts.append("Preferred Locations: " + ", ".join(locations))
    
    if user_data.get('preferred_role_types'):
        role_types = user_data['preferred_role_types']
        if isinstance(role_types, list):
            parts.append("Preferred Roles: " + ", ".join(role_types))
    
    if user_data.get('industries_like'):
        industries = user_data['industries_like']
        if isinstance(industries, list):
            parts.append("Preferred Industries: " + ", ".join(industries))
    
    # Recent job interactions (to understand preferences)
    if user_data.get('recent_interactions'):
        interaction_parts = []
        for interaction in user_data['recent_interactions'][:5]:  # Top 5 recent
            if interaction.get('job_title'):
                interaction_parts.append(interaction['job_title'])
        if interaction_parts:
            parts.append("Recent Interests: " + " | ".join(interaction_parts))
    
    return "\n".join(filter(None, parts))