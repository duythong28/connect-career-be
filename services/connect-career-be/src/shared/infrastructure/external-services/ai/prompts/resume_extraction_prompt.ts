export const RESUME_EXTRACTION_PROMPT = `Extract all text from this resume/CV document and format it in a clear, structured way.

IMPORTANT INSTRUCTIONS:
1. Preserve ALL information exactly as written
2. Maintain clear section headers (EXPERIENCE, EDUCATION, SKILLS, etc.)
3. Keep dates in their original format (e.g., "January 2020 - Present" or "2020-2022")
4. Preserve bullet points with • or - symbols
5. Keep contact information at the top (name, email, phone, location, links)
6. Maintain the hierarchical structure (Company → Position → Dates → Description)
7. Do NOT translate, summarize, or add any content
8. Do NOT remove any information
9. Format output as plain text with clear line breaks between sections

EXPECTED STRUCTURE:
[Name]
[Contact Info: email, phone, location]
[Links: LinkedIn, GitHub, Portfolio]

[OPTIONAL SUMMARY/OBJECTIVE SECTION]

WORK EXPERIENCE / EXPERIENCE
[Company Name]
[Job Title] | [Location]
[Start Date] - [End Date or Present]
• [Responsibility/Achievement 1]
• [Responsibility/Achievement 2]
[Technologies used if mentioned]

EDUCATION
[Institution Name]
[Degree] in [Field of Study] | [Location]
[Start Date] - [End Date]
[GPA if mentioned]
[Honors if mentioned]

SKILLS
[Comma-separated list of skills]

[OTHER SECTIONS as they appear: CERTIFICATIONS, PROJECTS, AWARDS, LANGUAGES, etc.]

Extract the resume now:
ADDITIONAL REQUIREMENTS FOR PARSING:
- Ensure each work experience entry is clearly separated
- Date ranges must be in format: "Month Year - Month Year" or "Month Year - Present"
- Technologies should be listed after job descriptions
- All bullet points should start with • or -
- Keep proper spacing between sections`;
