# Technical Implementation: AI Recruiting Assistant Streaming Architecture

## 1. System Overview

This platform implements a **real-time AI recruiting assistant** that supports both **job candidates** and **recruiters** through streaming conversational interactions.
The system is built on an **asynchronous, event-driven architecture** using **LangGraph**, enabling incremental response streaming, robust state management, and fault-tolerant persistence.

The assistant handles tasks such as:

- Job discovery and recommendation
- CV/profile understanding
- Candidate–job matching analysis
- Recruiter query handling (candidate search, screening support)
- Context-aware follow-up suggestions

---

## 2. Core Streaming Abstraction

The interaction pipeline is implemented using an **async generator**, allowing partial AI responses to be streamed to the frontend while maintaining a consistent internal state for persistence and post-processing.

### 2.1 Streamed Response Model

```python
class StreamChatResponse(BaseModel):
    messages: Optional[ChatMessage | list[ChatMessage]]
    is_done: bool
    is_error: bool
    needs_retry: Optional[bool]
    error_type: Optional[str]
    reach_retry_attemp_limit: Optional[bool]
    message_id: Optional[str]
    completed_at: Optional[datetime]
```

**Purpose**
This structure enables:

- Low-latency user feedback (token-level streaming)
- Explicit stream lifecycle control
- Clear error and retry semantics for UI and orchestration layers

---

## 3. Dual Message State Pattern

To prevent mutation conflicts between streaming output and persisted conversation history, the system applies a **dual message pattern**.

```python
yield_think_message   # streamed reasoning/status updates
think_message         # internal state (persisted)

yield_answer_message  # streamed AI response
answer_message        # accumulated final response (persisted)
```

**Design Rationale**

- Streaming messages prioritize responsiveness
- Internal messages guarantee consistency and auditability
- Separation enables post-hoc analysis (e.g., job-match explanation storage)

---

## 4. LangGraph Agent State (Recruitment Context)

The recruiting assistant operates over a structured **AgentState**, representing both conversational and domain-specific context.

```python
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    triage_message: Optional[ChatMessage]
    job_posts: Optional[str]
    candidate_profiles: Optional[str]
    recruiter_intents: Optional[str]
    faqs: Optional[List[dict]]
    thread_id: str
    user_profile: Optional[UserProfile]
    hallucination_retry: Optional[bool]
    analysis_result: Optional[ConversationAnalysisResult]
```

**Key Characteristics**

- Supports multi-role users (candidate vs recruiter)
- Preserves historical context for ranking and matching
- Enables downstream explainability (why a job or candidate was suggested)

---

## 5. Streaming Entry Point

### 5.1 `astream_chat()` – Primary Orchestration Method

```python
async def astream_chat(
    self,
    human_message: ChatMessage,
    session_id: uuid.UUID,
    user_id: uuid.UUID,
    manual_retry_attempts: int = 0,
    retried_message_id: uuid.UUID = None,
) -> AsyncGenerator[StreamChatResponse, None]:
```

**Responsibilities**

1. Initialize conversation artifacts
2. Construct agent state and execution configuration
3. Stream LangGraph execution events
4. Handle errors and retries
5. Persist finalized conversation data

---

## 6. Execution Phases

### Phase 1: Initialization

- Prepare runnable node messages (e.g., _“Analyzing job intent”_, _“Matching candidates”_)
- Create four distinct message instances (streamed vs persisted)

### Phase 2: Immediate Feedback

The system immediately streams a **thinking/status message** to assure responsiveness while heavy reasoning is ongoing.

---

### Phase 3: Agent State Setup

```python
state.messages = [human_message]
config = {
  "configurable": {"thread_id": session_id},
  "metadata": {...}
}
```

This ensures:

- Conversation continuity across retries
- Traceability for recruiter and candidate sessions

---

### Phase 4: LangGraph Event Streaming

The system consumes structured events from LangGraph:

- `on_chain_start` – Node execution begins (e.g., job intent routing)
- `on_chat_model_stream` – Token-level AI output
- `on_chain_end` – Node or graph completion

Each event is mapped to domain-specific behaviors such as:

- Updating reasoning status
- Streaming answer tokens
- Extracting job-matching analysis results

---

## 7. Event Processing Strategy

### 7.1 Node Lifecycle Events (Reasoning Updates)

Used to stream **progress indicators** such as:

- “Understanding candidate profile”
- “Evaluating job requirements”
- “Ranking job matches”

These messages are emitted **once per node** to avoid redundancy.

---

### 7.2 AI Response Streaming

During answer generation:

- Reasoning messages are finalized
- AI tokens are streamed incrementally
- Final responses are accumulated internally

This enables:

- Fast perceived response time
- Complete persisted answers for audit and analytics

---

## 8. Content Accumulation Semantics

```python
to_yield=True   → replace content (real-time streaming)
to_yield=False  → append content (final state)
```

**Why this matters**

- Streaming UIs require replacement semantics
- Databases require full conversation reconstruction

---

## 9. Tool Call Handling (Follow-up Suggestions)

The assistant can invoke tools such as `suggest_prompts` to generate contextual next actions:

- “View similar jobs”
- “Refine candidate search”
- “Prepare interview questions”

Suggestions are:

- Streamed immediately
- Persisted with a `group_suggestion_id`
- Reused across sessions if needed

Fallback logic parses suggestions from plain text if tool execution fails.

---

## 10. Error Handling & Retry Control

Errors are classified into:

- **Domain errors** (e.g., invalid job filters)
- **System errors** (timeouts, model failures)

Retry behavior:

- Limited manual retries (anti-loop protection)
- Explicit retry metadata for frontend control
- Graceful degradation messaging

---

## 11. Cleanup & Persistence

Persistence is executed **asynchronously** to avoid blocking the stream:

- All messages are saved once the stream completes
- Suggestions are migrated into a reusable recommendation store
- Partial conversations are preserved even on failure

This supports:

- Compliance and auditing
- Offline analytics (matching quality, recruiter behavior)
- Training data generation for future model improvements

---

## 12. Architectural Advantages

1. **Low latency**: token-level streaming
2. **Strong consistency**: dual message pattern
3. **Scalable orchestration**: LangGraph-based execution
4. **Explainability-ready**: analysis results persisted
5. **Fault-tolerant**: retry and fallback mechanisms
6. **Recruitment-specific extensibility**: jobs, candidates, recruiters as first-class entities

---

## 13. Summary

This architecture enables a **production-grade AI recruiting assistant** capable of handling complex job-matching and hiring workflows while maintaining responsiveness, reliability, and explainability—making it suitable for real-world recruitment platforms and academic research alike.

---
