# Mock AI Interview Roadmap

## Overview

The Mock AI Interview module drives multi‑agent interview simulations that mix adaptive questioning, evaluation, and coaching. It leans on existing shared services (VertexAI, notifications, learning) so candidates receive actionable feedback, personalized practice plans, and analytics over time.

## Experience Pillars

- **Interview Simulation** – Run behavioral, role-specific knowledge, professional skills, and communication rounds with scenario-based prompts.
- **Feedback & Scoring** – Produce per-question and per-dimension scores (0–100) with written and audio highlights.
- **Learning Loop** – Translate weaknesses into targeted learning plans, recommended readings, and repeat practice sessions.
- **Engagement** – Offer avatars, streaks, and collaborative mock panels to keep candidates progressing.

## Module Architecture

- **API Layer (`api/`)** – REST/WebSocket controllers for session lifecycle: create interview, stream questions, capture responses, finalize results.
- **Domain Layer (`domain/`)**
  - `InterviewSession` aggregate handles state transitions, timing, and sequencing of question blocks.
  - Agent services:
    - `InterviewerAgent` generates contextual questions via shared `AIModule`.
    - `EvaluatorAgent` scores text/audio answers using rubric prompts and speech sentiment.
    - `CoachAgent` produces rephrasing tips, STAR reminders, and pacing cues.
    - `ScenarioAgent` switches personas (HR, Tech Lead, Panel) using persona prompts.
  - Value objects for scoring dimensions, response metrics, and feedback snippets.
- **Infrastructure Layer (`infrastructure/`)**
  - Persistence adapters (PostgreSQL entities, optional Elasticsearch analytics writer).
  - Audio handling bridges to Whisper / Azure Speech / ElevenLabs.
  - Event publishers to Notifications and Learning modules.

## Core Features

1. **Adaptive Interview Flow**
   - Question queues seeded by role/stack templates.
   - Follow-up prompts tailored to prior answers and candidate goals.
2. **Multi-Modal Evaluation**
   - Text rubric scoring per dimension (content, depth, soft skills, language, timing).
   - Optional audio analysis for pronunciation, tone, and energy.
3. **Scorecards & Reporting**
   - Session summary with dimension scores, transcript highlights, and suggested improvements.
   - Downloadable PDF / shareable link for recruiter coaching.
4. **Learning Integration**
   - Export weak-skill tags to `LearningModule`.
   - Generate personalized reading/exercise playlists and schedule repeat drills.
5. **Analytics Dashboard**
   - Track score trends, confidence deltas, topic mastery, and completion streaks.
   - Surface insights for mentors/coaches in backoffice view.
6. **Engagement Extras**
   - AI avatar interviewer with lip-sync (optional).
   - Group mock sessions with AI facilitator for peer practice.
   - Gamified streaks, badges, leaderboards.

## Data Model Sketch

- `interview_sessions` – candidate, role, scenario, status, metadata.
- `interview_questions` – prompt, type, persona, follow-up references.
- `interview_responses` – text, audio URI, duration, raw sentiment.
- `interview_scores` – dimension, score, rationale snippet.
- `interview_feedback` – coach tips, action items, learning-tag links.
- `interview_metrics` – aggregated stats per topic/skill for analytics.

## External Integrations

- **LLM** – VertexAI provider (already available in `AIModule`), swap-able with Gemini/Mistral.
- **Speech** – Pluggable STT/TTS providers via interface (`SpeechService`), default to Whisper/Azure Speech.
- **Storage** – File system or S3-compatible bucket for audio/video artifacts.
- **Notifications** – Trigger post-interview summaries and reminders.
- **Learning Module** – Webhooks or direct service calls for roadmap updates.

## Implementation Notes

- Reuse guards and auth from `IdentityModule`; expose interview APIs under candidate scope.
- Use Nest queues (BullMQ) for async evaluation tasks to keep live interactions responsive.
- Keep prompts/versioning in `shared/infrastructure/external-services/ai/prompts`.
- Introduce feature flags to control rollout (e.g., audio scoring beta).
- Add e2e tests covering session creation, question sequencing, and scoring outputs.

---

graph TB

    subgraph "Client Layer"
        UI[User Interface<br/>React/Next.js]
        CallUI[Call Interface<br/>Retell Web Client]
    end

    subgraph "API Layer - NestJS Controllers"
        CreateAPI[POST /v1/candidates/mock-ai-interview<br/>createMockInterview]
        RegisterAPI[POST /api/register-call<br/>NEW ENDPOINT]
        GetCallAPI[GET /api/get-call<br/>NEW ENDPOINT]
        WebhookAPI[POST /v1/mock-ai-interview/webhook/retell<br/>EXISTING - Needs Implementation]
        QuestionsAPI[POST /v1/candidates/mock-ai-interview/questions/generate<br/>EXISTING]
        InsightsAPI[POST /api/generate-insights<br/>NEW ENDPOINT]
        AnalyzeAPI[POST /api/analyze-communication<br/>NEW ENDPOINT]
    end

    subgraph "Service Layer - Existing & New"
        InterviewSvc[MockInterviewService<br/>EXISTING]
        ResponseSvc[ResponseService<br/>NEW - Handle InterviewResponse]
        AnalyticsSvc[AnalyticsService<br/>NEW - Generate Analytics]
        InterviewerSvc[AgentInterviewerService<br/>EXISTING]
        FeedbackSvc[FeedbackService<br/>NEW - Handle InterviewFeedback]
        EvaluateSvc[EvaluateService<br/>EXISTING]
    end

    subgraph "Domain Layer - Entities"
        SessionEntity[(AIMockInterview<br/>mock_interview_sessions<br/>EXISTING)]
        ResponseEntity[(InterviewResponse<br/>mock_interview_responses<br/>EXISTING)]
        QuestionEntity[(InterviewQuestion<br/>mock_interview_questions<br/>EXISTING)]
        ScoreEntity[(InterviewScore<br/>mock_interview_scores<br/>EXISTING)]
        FeedbackEntity[(InterviewFeedback<br/>mock_interview_feedback<br/>EXISTING)]
        AgentEntity[(AgentInterviewer<br/>agent_interviewers<br/>EXISTING)]
    end

    subgraph "Infrastructure Layer"
        RetellProvider[RetellAIProvider<br/>EXISTING]
        AIService[AIService<br/>EXISTING - Gemini Integration]
        DB[(PostgreSQL Database<br/>TypeORM)]
    end

    subgraph "External Services"
        Retell[Retell API<br/>Voice AI Platform]
        Gemini[Google Gemini AI<br/>gemini-2.5-flash-lite]
    end

    UI --> CreateAPI
    UI --> QuestionsAPI
    UI --> InsightsAPI
    CallUI --> RegisterAPI
    CallUI --> GetCallAPI

    CreateAPI --> InterviewSvc
    RegisterAPI --> InterviewerSvc
    RegisterAPI --> RetellProvider
    GetCallAPI --> ResponseSvc
    GetCallAPI --> AnalyticsSvc
    WebhookAPI --> ResponseSvc
    WebhookAPI --> AnalyticsSvc
    QuestionsAPI --> InterviewSvc
    InsightsAPI --> InterviewSvc
    InsightsAPI --> ResponseSvc
    InsightsAPI --> AIService
    AnalyzeAPI --> AIService

    InterviewSvc --> SessionEntity
    InterviewSvc --> QuestionEntity
    InterviewSvc --> AIService
    ResponseSvc --> ResponseEntity
    ResponseSvc --> SessionEntity
    InterviewerSvc --> AgentEntity
    InterviewerSvc --> RetellProvider
    FeedbackSvc --> FeedbackEntity
    FeedbackSvc --> SessionEntity
    AnalyticsSvc --> ResponseSvc
    AnalyticsSvc --> InterviewSvc
    AnalyticsSvc --> AIService
    EvaluateSvc --> ScoreEntity
    EvaluateSvc --> SessionEntity

    RetellProvider --> Retell
    AIService --> Gemini

    SessionEntity --> DB
    ResponseEntity --> DB
    QuestionEntity --> DB
    ScoreEntity --> DB
    FeedbackEntity --> DB
    AgentEntity --> DB

    Retell --> WebhookAPI
    CallUI <--> Retell

    style CreateAPI fill:#e1f5ff
    style RegisterAPI fill:#ffd93d
    style GetCallAPI fill:#ffd93d
    style WebhookAPI fill:#ffd93d
    style InsightsAPI fill:#ffd93d
    style AnalyzeAPI fill:#ffd93d
    style ResponseSvc fill:#ffd93d
    style AnalyticsSvc fill:#ffd93d
    style FeedbackSvc fill:#ffd93d

sequenceDiagram
participant Client as Client Browser
participant UI as Interview UI
participant API as NestJS Controllers
participant InterviewSvc as MockInterviewService<br/>(EXISTING)
participant ResponseSvc as ResponseService<br/>(NEW)
participant InterviewerSvc as AgentInterviewerService<br/>(EXISTING)
participant RetellProvider as RetellAIProvider<br/>(EXISTING)
participant DB as PostgreSQL DB<br/>(TypeORM)
participant Retell as Retell API
participant Gemini as Gemini AI<br/>(AIService)
participant Webhook as Webhook Handler<br/>(EXISTING - Needs Impl)
participant AnalyticsSvc as AnalyticsService<br/>(NEW)

    Note over Client,AnalyticsSvc: Phase 1: Interview Creation (EXISTING)
    Client->>API: POST /v1/candidates/mock-ai-interview<br/>(CreateMockInterviewDto)
    API->>InterviewSvc: createMockInterview(dto, candidateId)
    InterviewSvc->>DB: Save AIMockInterview entity
    DB-->>InterviewSvc: Session created
    InterviewSvc-->>API: { callId, callUrl, readableSlug }
    API-->>Client: Interview URL generated

    Note over Client,AnalyticsSvc: Phase 2: Question Generation (EXISTING - Optional)
    Client->>API: POST /v1/candidates/mock-ai-interview/questions/generate
    API->>InterviewSvc: generateMockInterviewQuestion(dto, candidateId)
    InterviewSvc->>DB: Save AIMockInterview
    InterviewSvc->>Gemini: Generate questions (gemini-2.5-flash-lite)
    Gemini-->>InterviewSvc: Questions JSON
    InterviewSvc->>DB: Save InterviewQuestion entities
    InterviewSvc-->>API: { mockInterviewSession, questions, description }
    API-->>Client: Generated questions

    Note over Client,AnalyticsSvc: Phase 3: User Accesses Interview
    Client->>UI: Navigate to /mock-interview/[callId]
    UI->>API: GET /v1/candidates/mock-ai-interview/:id<br/>(NEW - or extend existing)
    API->>InterviewSvc: getSession(sessionId)
    InterviewSvc->>DB: Fetch AIMockInterview with relations
    DB-->>InterviewSvc: Interview data
    InterviewSvc-->>UI: Interview details

    Note over Client,AnalyticsSvc: Phase 4: Start Interview Call (NEW)
    Client->>UI: Enter email/name & click Start
    UI->>ResponseSvc: getAllEmailsBySessionId(sessionId)
    ResponseSvc->>DB: Check existing InterviewResponse emails
    DB-->>ResponseSvc: Email list
    ResponseSvc-->>UI: Validation result

    alt Email not exists
        UI->>API: POST /api/register-call<br/>(interviewer_id, session_id, email, name)
        API->>InterviewerSvc: getInterviewerById(interviewerId)
        InterviewerSvc->>DB: Fetch AgentInterviewer
        DB-->>InterviewerSvc: Interviewer with retellAgentId
        API->>RetellProvider: createWebCall(agent_id, dynamic_variables)
        RetellProvider->>Retell: Create web call API
        Retell-->>RetellProvider: Call ID & Access Token
        RetellProvider-->>API: Call credentials

        API->>ResponseSvc: createResponse(sessionId, callId, email, name)
        ResponseSvc->>DB: Insert InterviewResponse record<br/>(with callId, email, is_ended: false)
        DB-->>ResponseSvc: Response ID

        API-->>UI: { callId, accessToken, callUrl }
        UI->>Retell: Start call (access_token)
        Retell-->>UI: Call connected
        Note over UI,Retell: Voice conversation starts

        UI->>InterviewSvc: Update session status to IN_PROGRESS
        InterviewSvc->>DB: Update AIMockInterview.status

    else Email exists
        UI-->>Client: Show "Already responded" message
    end

    Note over Client,AnalyticsSvc: Phase 5: During Call (Real-time)
    loop Real-time Updates
        Retell->>UI: Transcript updates via WebSocket
        UI->>Client: Display transcript
        Retell->>UI: Agent/user turn events
        UI->>Client: Update UI state
    end

    Note over Client,AnalyticsSvc: Phase 6: Call Ends
    alt User ends call OR Time limit reached
        UI->>Retell: Stop call
        Retell-->>UI: Call ended
        UI->>ResponseSvc: updateResponse(callId, { is_ended: true })
        ResponseSvc->>DB: Update InterviewResponse
        UI->>InterviewSvc: Update session status to COMPLETED
        InterviewSvc->>DB: Update AIMockInterview
    end

    Note over Client,AnalyticsSvc: Phase 7: Call Analysis (Webhook Triggered - NEW)
    Retell->>Webhook: POST /v1/mock-ai-interview/webhook/retell<br/>(event: call_analyzed, call_id)
    Webhook->>API: Internal call to get-call handler
    API->>ResponseSvc: getResponseByCallId(callId)
    ResponseSvc->>DB: Fetch InterviewResponse
    DB-->>ResponseSvc: Response data

    alt Response not analyzed (is_analysed: false)
        API->>RetellProvider: retrieveCallDetails(callId)
        RetellProvider->>Retell: Get call details API
        Retell-->>RetellProvider: Call transcript & metadata
        RetellProvider-->>API: Call data

        API->>AnalyticsSvc: generateInterviewAnalytics(callData, sessionId)
        AnalyticsSvc->>InterviewSvc: getSession(sessionId)
        InterviewSvc->>DB: Fetch AIMockInterview with questions
        DB-->>InterviewSvc: Interview data
        AnalyticsSvc->>Gemini: Analyze transcript<br/>(gemini-2.5-flash-lite)
        Gemini-->>AnalyticsSvc: Analytics JSON<br/>(scores, feedback, insights)
        AnalyticsSvc->>ResponseSvc: updateResponse(callId, { analytics, is_analysed: true })
        AnalyticsSvc->>DB: Save InterviewScore entities
        AnalyticsSvc->>DB: Save InterviewFeedback entities
        ResponseSvc->>DB: Update InterviewResponse with analytics
        AnalyticsSvc->>InterviewSvc: updateSessionResults(sessionId, results)
        InterviewSvc->>DB: Update AIMockInterview.results
        API-->>Webhook: Analytics data saved

    else Response already analyzed
        API-->>Webhook: Existing analytics
    end

    Note over Client,AnalyticsSvc: Phase 8: Generate Insights (NEW - Optional)
    Client->>API: POST /api/generate-insights<br/>(sessionId)
    API->>ResponseSvc: getAllResponsesBySessionId(sessionId)
    ResponseSvc->>DB: Fetch all InterviewResponse records
    DB-->>ResponseSvc: Responses array
    API->>InterviewSvc: getSession(sessionId)
    InterviewSvc->>DB: Fetch AIMockInterview
    DB-->>InterviewSvc: Interview data
    API->>Gemini: Generate insights<br/>(call summaries, interview details)
    Gemini-->>API: Insights JSON
    API->>InterviewSvc: updateInterview(sessionId, { insights })
    InterviewSvc->>DB: Update AIMockInterview with insights
    API-->>Client: Insights generated

    Note over Client,AnalyticsSvc: Phase 9: Communication Analysis (NEW - Optional)
    Client->>API: POST /api/analyze-communication<br/>(transcript)
    API->>Gemini: Analyze communication skills<br/>(gemini-2.5-flash-lite)
    Gemini-->>API: Communication analysis JSON
    API-->>Client: Analysis results

flowchart TD
Start([Interview Creation<br/>EXISTING]) --> Create[Create AIMockInterview Record<br/>MockInterviewService.createMockInterview]
Create --> GenerateQ{Generate Questions?<br/>EXISTING}
GenerateQ -->|Yes| QGen[Call Gemini API<br/>gemini-2.5-flash-lite]
QGen --> SaveQ[Save InterviewQuestion entities<br/>to DB]
GenerateQ -->|No| Share[Share Interview Link<br/>/mock-interview/:callId]
SaveQ --> Share

    Share --> Access[User Accesses Link]
    Access --> Validate[Validate Interview Active<br/>Check AIMockInterview.status]
    Validate -->|Invalid/Cancelled| Error[Show Error]
    Validate -->|Valid| Form[Show Email/Name Form]

    Form --> CheckEmail[Check Email Exists<br/>ResponseService.getAllEmailsBySessionId]
    CheckEmail -->|Exists| Duplicate[Show Duplicate Message]
    CheckEmail -->|New| Register[Register Call with Retell<br/>NEW: POST /api/register-call]

    Register --> GetAgent[Get AgentInterviewer<br/>AgentInterviewerService.getInterviewerById]
    GetAgent --> CreateCall[Create Web Call via Retell<br/>RetellAIProvider.createWebCall]
    CreateCall --> CreateResp[Create InterviewResponse Record<br/>NEW: ResponseService.createResponse<br/>callId, email, name, is_ended: false]
    CreateResp --> StartCall[Start Voice Call<br/>Retell Web Client]
    StartCall --> UpdateStatus[Update AIMockInterview.status<br/>to IN_PROGRESS]
    UpdateStatus --> Conversation[Real-time Conversation<br/>Retell WebSocket]

    Conversation --> EndCall{Call Ends?<br/>User ends OR Time limit}
    EndCall -->|No| Conversation
    EndCall -->|Yes| UpdateResp[Update InterviewResponse<br/>is_ended: true<br/>NEW: ResponseService.updateResponse]
    UpdateResp --> UpdateSessionStatus[Update AIMockInterview.status<br/>to COMPLETED]

    UpdateSessionStatus --> Webhook[Retell Webhook Triggered<br/>EXISTING: /v1/mock-ai-interview/webhook/retell<br/>event: call_analyzed]
    Webhook --> FetchCall[Fetch Call Details from Retell<br/>NEW: RetellAIProvider.retrieveCallDetails]
    FetchCall --> CheckAnal[Check if Analyzed<br/>InterviewResponse.is_analysed]

    CheckAnal -->|Not Analyzed| GenAnal[Generate Analytics via Gemini<br/>NEW: AnalyticsService.generateInterviewAnalytics]
    GenAnal --> SaveScores[Save InterviewScore entities<br/>to DB]
    SaveScores --> SaveFeedback[Save InterviewFeedback entities<br/>to DB]
    SaveFeedback --> SaveAnal[Update InterviewResponse<br/>analytics, is_analysed: true<br/>Update AIMockInterview.results]
    CheckAnal -->|Already Analyzed| ReturnAnal[Return Existing Analytics]
    SaveAnal --> ReturnAnal

    ReturnAnal --> GenInsights{Generate Insights?<br/>NEW: Optional}
    GenInsights -->|Yes| Insights[Call Gemini for Insights<br/>NEW: POST /api/generate-insights]
    Insights --> SaveInsights[Update AIMockInterview<br/>with insights JSON]
    GenInsights -->|No| Complete([Complete])
    SaveInsights --> Complete

    style Start fill:#e1f5ff
    style Complete fill:#3ecf8e
    style Error fill:#ff6b6b
    style Duplicate fill:#ff6b6b
    style QGen fill:#4ecdc4
    style GenAnal fill:#4ecdc4
    style Insights fill:#4ecdc4
    style Register fill:#ffd93d
    style CreateResp fill:#ffd93d
    style UpdateResp fill:#ffd93d
    style Webhook fill:#ffd93d
    style FetchCall fill:#ffd93d
    style GenAnal fill:#ffd93d
    style SaveScores fill:#ffd93d
    style SaveFeedback fill:#ffd93d
    style SaveAnal fill:#ffd93d
    style Insights fill:#ffd93d
    style SaveInsights fill:#ffd93d
