# Sample Resume for Testing

## Test with this resume text via the API

```
John Doe
Senior Software Engineer
San Francisco, CA
john.doe@email.com | +1 (555) 123-4567
https://linkedin.com/in/johndoe | https://github.com/johndoe | https://johndoe.dev

SUMMARY
Experienced Senior Software Engineer with 8+ years of expertise in full-stack development, cloud architecture, and team leadership. Proven track record of delivering scalable solutions and mentoring engineering teams.

WORK EXPERIENCE

Google LLC
Senior Software Engineer | Mountain View, CA
January 2020 - Present
• Led development of microservices architecture serving 10M+ daily active users
• Improved API response time by 45% through optimization and caching strategies
• Mentored team of 5 junior engineers and conducted code reviews
• Implemented CI/CD pipeline reducing deployment time by 60%
• Technologies: TypeScript, Node.js, React, Kubernetes, GCP, PostgreSQL
• Achieved 99.9% uptime for critical production services

Facebook (Meta)
Software Engineer II | Menlo Park, CA
June 2018 - December 2019
• Built and maintained real-time messaging features for 500M+ users
• Reduced database query latency by 35% through query optimization
• Collaborated with cross-functional teams on product roadmap
• Implemented A/B testing framework used by 20+ product teams
• Technologies: JavaScript, React, GraphQL, MySQL, Redis

Startup Inc.
Full Stack Developer | San Francisco, CA
March 2016 - May 2018
• Developed MVP for B2B SaaS platform from ground up
• Integrated payment processing with Stripe API
• Built responsive web application using React and Node.js
• Managed AWS infrastructure and deployment pipeline
• Technologies: React, Node.js, MongoDB, AWS, Docker

EDUCATION

Stanford University
Master of Science in Computer Science | Stanford, CA
September 2014 - June 2016
GPA: 3.85/4.0
Honors: Dean's List, Research Assistant

University of California, Berkeley
Bachelor of Science in Computer Science | Berkeley, CA
September 2010 - May 2014
GPA: 3.7/4.0
Honors: Cum Laude, ACM Member

SKILLS
JavaScript, TypeScript, Python, Java, React, Vue.js, Angular, Node.js, Express, NestJS, MongoDB, PostgreSQL, MySQL, Redis, AWS, GCP, Azure, Docker, Kubernetes, CI/CD, Git, REST APIs, GraphQL, Microservices, System Design, Agile, Scrum, Leadership, Communication, Problem Solving, Mentoring

CERTIFICATIONS
AWS Certified Solutions Architect - Professional
Google Cloud Professional Cloud Architect
Issued: January 2022

LANGUAGES
English - Native
Spanish - Advanced
Mandarin Chinese - Intermediate
```

## API Endpoints for Testing

### 1. Parse Resume Text (Direct Text Input)

**Endpoint:** `POST http://localhost:3000/v1/ai/cv/parse-resume-text`

**Request Body:**

```json
{
  "text": "... paste resume text here ..."
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "cvContent": {
      "personalInfo": { ... },
      "summary": "...",
      "workExperience": [ ... ],
      "education": [ ... ],
      "skills": { ... }
    },
    "fullParsed": {
      // Complete parsed data with all details
    }
  }
}
```

### 2. Parse Resume from PDF URL

**Endpoint:** `POST http://localhost:3000/v1/ai/cv/parse-resume-from-pdf`

**Request Body:**

```json
{
  "url": "https://example.com/resume.pdf",
  "prompt": "Extract all text exactly as it appears. Do not add content.",
  "temperature": 0
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "extractedText": "... raw extracted text ...",
    "cvContent": { ... },
    "fullParsed": { ... }
  }
}
```

## Testing with cURL

### Test 1: Parse Resume Text

```bash
curl -X POST http://localhost:3000/v1/ai/cv/parse-resume-text \
  -H "Content-Type: application/json" \
  -d '{
    "text": "John Doe\nSenior Software Engineer\njohn.doe@email.com\n\nEXPERIENCE\nGoogle LLC\nSenior Engineer\nJan 2020 - Present\n• Led team of 5 engineers\n• Improved performance by 45%\n\nEDUCATION\nStanford University\nMS Computer Science\n2014-2016"
  }'
```

### Test 2: Parse Resume from PDF

```bash
curl -X POST http://localhost:3000/v1/ai/cv/parse-resume-from-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/resume.pdf"
  }'
```

## Testing with Postman or Thunder Client (VS Code)

1. Create a new POST request
2. Set URL to: `http://localhost:3000/v1/ai/cv/parse-resume-text`
3. Set Headers: `Content-Type: application/json`
4. Set Body (raw JSON):

```json
{
  "text": "John Doe\nSenior Software Engineer\nSan Francisco, CA\njohn.doe@email.com | +1 (555) 123-4567\nhttps://linkedin.com/in/johndoe\n\nSUMMARY\nExperienced engineer with 8+ years...\n\nWORK EXPERIENCE\n\nGoogle LLC\nSenior Software Engineer | Mountain View, CA\nJanuary 2020 - Present\n• Led development of microservices\n• Improved API response time by 45%\n• Mentored 5 engineers\n\nEDUCATION\n\nStanford University\nMaster of Science in Computer Science\n2014 - 2016\nGPA: 3.85"
}
```

## Expected Output Structure

The parser will return:

### cvContent (Frontend-ready)

- `personalInfo`: name, email, phone, linkedin, github, etc.
- `summary`: professional summary
- `workExperience[]`: array of jobs with id, company, position, dates, description, technologies, achievements
- `education[]`: array of education with id, institution, degree, field, dates, gpa, honors
- `skills`: technical, soft, and language skills categorized

### fullParsed (Complete data)

- All the above plus additional metadata
- `rawSections`: original text sections for reference
- More detailed breakdowns of responsibilities, achievements, etc.
