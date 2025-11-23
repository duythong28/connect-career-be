# ============================================

# SETUP: Variables (Replace with your actual values)

# ============================================

BASE_URL="http://localhost:3000"
AUTH_TOKEN="your-jwt-token-here" # Get this from login endpoint
INTERVIEWER_ID="your-interviewer-uuid" # Get from GET /v1/candidates/mock-ai-interview/interviewers

# ============================================

# Phase 1: Interview Creation

# POST /v1/candidates/mock-ai-interview

# ============================================

curl -X POST "${BASE_URL}/v1/candidates/mock-ai-interview" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "interviewerAgentId": "'"${INTERVIEWER_ID}"'",
"customPrompt": "Conduct a technical interview focused on system design and algorithms",
"jobDescription": "We are looking for a senior software engineer with 5+ years of experience in backend development, system design, and cloud architecture.",
"name": "Senior Software Engineer Mock Interview",
"duration": 30,
"difficulty": "intermediate",
"focusAreas": ["system design", "algorithms", "communication"],
"audioEnabled": true,
"realtimeScoring": false,
"questions": []
}'

# Response will contain:

# {

# "response": "Interview created successfully",

# "callId": "session-uuid-here",

# "callUrl": "http://frontend-url/mock-interview/session-uuid-here",

# "readableSlug": "senior-software-engineer-mock-interview"

# }

# Save the callId (sessionId) for next steps

SESSION_ID="session-uuid-from-response"

# ============================================

# Phase 2: Question Generation (Optional)

# POST /v1/candidates/mock-ai-interview/questions/generate

# ============================================

curl -X POST "${BASE_URL}/v1/candidates/mock-ai-interview/questions/generate" \
 -H "Content-Type: application/json" \
 -H "Authorization: Bearer ${AUTH_TOKEN}" \
 -d '{
"customPrompt": "Conduct a technical interview focused on system design and algorithms",
"jobDescription": "We are looking for a senior software engineer with 5+ years of experience in backend development, system design, and cloud architecture.",
"duration": 30,
"difficulty": "intermediate",
"focusAreas": ["system design", "algorithms", "communication"],
"audioEnabled": true,
"realtimeScoring": false
}'

# Response will contain:

# {

# "mockInterviewSession": { ... },

# "questions": [

# {

# "question": "Tell me about yourself.",

# "type": "opener",

# "persona": "Henry",

# "order": 1,

# "timeLimit": 120

# },

# ...

# ],

# "description": "A technical interview focusing on system design..."

# }

# ============================================

# Phase 3: User Accesses Interview

# GET /v1/candidates/mock-ai-interview/:id

# ============================================

curl -X GET "${BASE_URL}/v1/candidates/mock-ai-interview/${SESSION_ID}" \
 -H "Authorization: Bearer ${AUTH_TOKEN}"

# Response will contain:

# {

# "success": true,

# "data": {

# "id": "session-uuid",

# "candidateId": "candidate-uuid",

# "status": "created",

# "configuration": { ... },

# "questions": [ ... ],

# "responses": [ ... ]

# }

# }

# ============================================

# Phase 4: Start Interview Call

# POST /v1/call/mock-ai-interview/register-call

# ============================================

curl -X POST "${BASE_URL}/v1/call/mock-ai-interview/register-call" \
  -H "Content-Type: application/json" \
  -d '{
    "interviewerId": "'"${INTERVIEWER_ID}"'",
"sessionId": "'"${SESSION_ID}"'",
"email": "candidate@example.com",
"name": "John Doe",
"dynamicData": {
"candidate_role": "Senior Software Engineer",
"years_of_experience": "5"
}
}'

# Response will contain:

# {

# "success": true,

# "data": {

# "callId": "retell-call-id",

# "accessToken": "retell-access-token",

# "responseId": "response-uuid"

# }

# }

# Save the callId for next steps

CALL_ID="retell-call-id-from-response"

# ============================================

# Phase 5: During Call (Real-time)

# Note: This is handled by Retell WebSocket

# You can check call status using:

# GET /v1/call/mock-ai-interview/get-call/:callId

# ============================================

curl -X GET "${BASE_URL}/v1/call/mock-ai-interview/get-call/${CALL_ID}"

# Response will contain:

# {

# "success": true,

# "data": {

# "response": {

# "id": "response-uuid",

# "callId": "retell-call-id",

# "sessionId": "session-uuid",

# "email": "candidate@example.com",

# "name": "John Doe",

# "isEnded": false,

# "isAnalysed": false

# },

# "callData": {

# "transcript": "...",

# "status": "in_progress",

# "duration": 300

# }

# }

# }

# ============================================

# Phase 6: Call Ends

# Note: This is typically handled by the frontend

# when user ends the call or time limit is reached.

# The response will be updated automatically.

# You can verify by checking the call status again:

# ============================================

curl -X GET "${BASE_URL}/v1/call/mock-ai-interview/get-call/${CALL_ID}"

# After call ends, isEnded should be true

# ============================================

# Phase 7: Call Analysis (Webhook Triggered)

# POST /v1/mock-ai-interview/webhook/retell

# This is called by Retell when call is analyzed

# ============================================

curl -X POST "${BASE_URL}/v1/mock-ai-interview/webhook/retell" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "call_analyzed",
    "call_id": "'"${CALL_ID}"'"
}'

# Response will contain:

# {

# "success": true,

# "message": "Webhook processed successfully"

# }

# Verify analytics were generated:

curl -X GET "${BASE_URL}/v1/call/mock-ai-interview/get-call/${CALL_ID}"

# Response should now contain analytics:

# {

# "success": true,

# "data": {

# "response": {

# "isAnalysed": true,

# "analytics": {

# "overallScore": 85,

# "dimensionScores": { ... },

# "strengths": [ ... ],

# "weaknesses": [ ... ]

# }

# }

# }

# }

# ============================================

# Phase 8: Generate Insights (Optional)

# POST /v1/call/mock-ai-interview/update-response

# ============================================

curl -X POST "${BASE_URL}/v1/call/mock-ai-interview/update-response" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "sessionId": "'"${SESSION_ID}"'"
}'

# Response will contain:

# {

# "success": true,

# "data": {

# "overallTrends": "Positive trend across all candidates...",

# "commonStrengths": [

# "Strong communication skills",

# "Good technical knowledge"

# ],

# "commonWeaknesses": [

# "Could improve system design explanations",

# "Needs more practice with algorithms"

# ],

# "recommendations": [

# "Practice explaining system design concepts",

# "Review common algorithm patterns"

# ],

# "keyLearnings": [

# "Candidates perform well in behavioral questions",

# "Technical depth needs improvement"

# ]

# }

# }

# ============================================

# Phase 9: Communication Analysis (Optional)

# POST /v1/call/mock-ai-interview/analyze-communication

# ============================================

curl -X POST "${BASE_URL}/v1/call/mock-ai-interview/analyze-communication" \
 -H "Content-Type: application/json" \
 -H "Authorization: Bearer ${AUTH_TOKEN}" \
 -d '{
"transcript": "Interviewer: Tell me about yourself. Candidate: I am a software engineer with 5 years of experience in backend development. I have worked on several large-scale systems and have expertise in system design and cloud architecture. Interviewer: Can you describe a challenging project you worked on? Candidate: Sure, I worked on a distributed system that needed to handle millions of requests per day..."
}'

# Response will contain:

# {

# "success": true,

# "data": {

# "clarityScore": 85,

# "structureScore": 80,

# "pacingScore": 90,

# "toneScore": 85,

# "overallCommunicationScore": 85,

# "strengths": [

# "Clear articulation",

# "Good pacing",

# "Professional tone"

# ],

# "weaknesses": [

# "Could be more structured",

# "Sometimes too verbose"

# ],

# "recommendations": [

# "Practice structuring answers using STAR method",

# "Work on being more concise"

# ]

# }

# }

# ============================================

# BONUS: Get All Interviewers

# GET /v1/candidates/mock-ai-interview/interviewers

# ============================================

curl -X GET "${BASE_URL}/v1/candidates/mock-ai-interview/interviewers" \
 -H "Authorization: Bearer ${AUTH_TOKEN}"

# Response will contain:

# {

# "success": true,

# "data": [

# {

# "id": "interviewer-uuid",

# "name": "Henry",

# "retellAgentId": "retell-agent-id",

# "rapport": 7,

# "exploration": 10,

# "empathy": 7,

# "speed": 5

# },

# ...

# ]

# }

# ============================================

# BONUS: Get Specific Interviewer

# GET /v1/candidates/mock-ai-interview/interviewers/:id

# ============================================

curl -X GET "${BASE_URL}/v1/candidates/mock-ai-interview/interviewers/${INTERVIEWER_ID}" \
 -H "Authorization: Bearer ${AUTH_TOKEN}"

# ============================================

# BONUS: Generate Specific Areas from Job Description

# POST /v1/candidates/mock-ai-interview/questions/specific-areas

# ============================================

curl -X POST "${BASE_URL}/v1/candidates/mock-ai-interview/questions/specific-areas" \
 -H "Content-Type: application/json" \
 -H "Authorization: Bearer ${AUTH_TOKEN}" \
 -d '{
"jobDescription": "We are looking for a senior software engineer with 5+ years of experience in backend development, system design, and cloud architecture. Must have experience with Node.js, TypeScript, PostgreSQL, Redis, AWS, Docker, and Kubernetes."
}'

# Response will contain:

# {

# "areas": [

# "Node.js",

# "TypeScript",

# "PostgreSQL",

# "Redis",

# "AWS",

# "Docker",

# "Kubernetes",

# "System Design",

# "Backend Development",

# "Cloud Architecture"

# ]

# }
