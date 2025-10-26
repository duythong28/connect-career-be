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
