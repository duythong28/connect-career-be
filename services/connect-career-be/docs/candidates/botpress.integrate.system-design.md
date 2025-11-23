Creating an improved AI-native multi-agent system design that addresses the gaps. Providing the complete redesigned document:

[1 tool called]

# System Design: AI-Native Multi-Agent Career Assistant with Botpress Integration

## 1. System Overview

### 1.1 Purpose

Build an AI-native, multi-agent career assistant that provides:

- Intelligent job matching with explainable recommendations
- Proactive career guidance and skill gap analysis
- Multi-step interview preparation and mock interviews
- Adaptive application status tracking with predictive insights
- Personalized career path planning
- Context-aware FAQ and knowledge assistance

### 1.2 Design Principles

- AI-native architecture: Multi-agent system with orchestration
- Separation of concerns: Botpress (conversation) ↔ Orchestrator (reasoning) ↔ Agents (specialized tasks)
- Long-term memory: Episodic, semantic, and procedural memory
- Proactive intelligence: Event-driven triggers and suggestions
- Agent-scoped RAG: Specialized knowledge bases per agent
- Multi-step reasoning: Workflow orchestration for complex tasks
- Tool-based architecture: Agents use tools (business services) via schemas
- Scalable and maintainable: Modular agent design

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Interaction Layer                      │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Botpress Platform                         │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │  │
│  │  │   Channels   │  │   NLU Engine │  │   Dialog     │      │  │
│  │  │ (Web/Mobile) │  │  (Intent/    │  │   Manager    │      │  │
│  │  │              │  │   Entity)    │  │              │      │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │  │
│  │         │                  │                  │               │  │
│  │         └──────────────────┼──────────────────┘               │  │
│  │                            │                                   │  │
│  │                    ┌───────▼────────┐                          │  │
│  │                    │  Custom Actions│                          │  │
│  │                    │  & Webhooks    │                          │  │
│  │                    └───────┬────────┘                          │  │
│  └────────────────────────────┼───────────────────────────────────┘  │
└────────────────────────────────┼─────────────────────────────────────┘
                                 │
                                 │ HTTPS/REST
                                 │
┌────────────────────────────────▼─────────────────────────────────────┐
│                    Integration & API Layer                          │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │           Botpress Integration Module                        │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  BotpressController                                    │  │  │
│  │  │  - Webhook Handler                                     │  │  │
│  │  │  - Request Validation                                  │  │  │
│  │  │  - Response Formatting                                 │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  BotpressIntegrationService                            │  │  │
│  │  │  - Intent Extraction                                   │  │  │
│  │  │  - Request Preprocessing                               │  │  │
│  │  │  - Response Postprocessing                             │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │
┌────────────────────────────────▼─────────────────────────────────────┐
│              AI-Native Multi-Agent Orchestration Layer              │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Orchestrator Agent (Supervisor)                 │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  Task Decomposition                                    │  │  │
│  │  │  - Analyze user intent                                 │  │  │
│  │  │  - Break into subtasks                                 │  │  │
│  │  │  - Plan execution sequence                             │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  Agent Selection & Routing                             │  │  │
│  │  │  - Select appropriate agent(s)                         │  │  │
│  │  │  - Route to specialized agents                         │  │  │
│  │  │  - Coordinate multi-agent workflows                    │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  Workflow Orchestration (LangGraph)                    │  │  │
│  │  │  - State machine for multi-step tasks                  │  │  │
│  │  │  - Conditional branching                               │  │  │
│  │  │  - Parallel execution                                  │  │  │
│  │  │  - Error recovery                                      │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  Response Synthesis                                    │  │  │
│  │  │  - Aggregate agent outputs                             │  │  │
│  │  │  - Resolve conflicts                                   │  │  │
│  │  │  - Generate final response                             │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Specialized Agent Layer                         │  │
│  │                                                              │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │  │
│  │  │ JobMatch     │  │ CareerCoach  │  │ Interview    │      │  │
│  │  │ Agent        │  │ Agent        │  │ Agent        │      │  │
│  │  │              │  │              │  │              │      │  │
│  │  │ - Job search │  │ - Career     │  │ - Mock       │      │  │
│  │  │ - Matching   │  │   planning   │  │   interviews │      │  │
│  │  │ - Ranking    │  │ - Skill gap  │  │ - Practice   │      │  │
│  │  │ - Explain    │  │   analysis   │  │   questions  │      │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │  │
│  │         │                 │                 │               │  │
│  │  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐      │  │
│  │  │ Application  │  │ Research     │  │ Proactive    │      │  │
│  │  │ Status Agent │  │ Agent        │  │ Agent        │      │  │
│  │  │              │  │              │  │              │      │  │
│  │  │ - Status     │  │ - Knowledge  │  │ - Event      │      │  │
│  │  │   tracking   │  │   retrieval  │  │   triggers   │      │  │
│  │  │ - Timeline   │  │ - FAQ        │  │ - Notifications│    │  │
│  │  │ - Next steps │  │ - Research   │  │ - Insights   │      │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Agent Communication Layer                        │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  Agent-to-Agent Messaging                              │  │  │
│  │  │  - Message bus (Redis Pub/Sub or RabbitMQ)             │  │  │
│  │  │  - Agent coordination                                  │  │  │
│  │  │  - Shared context                                      │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  Tool Registry & Routing                               │  │  │
│  │  │  - Tool schemas (OpenAI Function Calling format)       │  │  │
│  │  │  - Tool discovery                                      │  │  │
│  │  │  - Tool execution                                      │  │  │
│  │  │  - Result aggregation                                  │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │
┌────────────────────────────────▼─────────────────────────────────────┐
│              Agent-Scoped RAG & Memory Layer                        │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Agent-Specific RAG Services                     │  │
│  │                                                              │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │  │
│  │  │ JobMatch RAG │  │ Career RAG   │  │ Interview    │      │  │
│  │  │              │  │              │  │ RAG          │      │  │
│  │  │ - Job corpus │  │ - Career     │  │ - Interview  │      │  │
│  │  │ - Company    │  │   guides     │  │   resources  │      │  │
│  │  │   info       │  │ - Skill maps │  │ - Questions  │      │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │  │
│  │                                                              │  │
│  │  ┌──────────────┐  ┌──────────────┐                        │  │
│  │  │ Application  │  │ Knowledge    │                        │  │
│  │  │ RAG          │  │ Base RAG     │                        │  │
│  │  │              │  │              │                        │  │
│  │  │ - Process    │  │ - FAQs       │                        │  │
│  │  │   docs       │  │ - Policies   │                        │  │
│  │  │ - Status     │  │ - General    │                        │  │
│  │  │   guides     │  │   knowledge  │                        │  │
│  │  └──────────────┘  └──────────────┘                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Long-Term Memory System                         │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  Episodic Memory                                       │  │  │
│  │  │  - Past conversations (semantic search)                │  │  │
│  │  │  - User actions (applied, saved, viewed)               │  │  │
│  │  │  - Interaction patterns                                │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  Semantic Memory                                       │  │  │
│  │  │  - User preferences (stored in vector DB)              │  │  │
│  │  │  - Skills and experience                               │  │  │
│  │  │  - Career goals                                        │  │  │
│  │  │  - Job preferences                                     │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  Procedural Memory                                     │  │  │
│  │  │  - User behavior patterns                              │  │  │
│  │  │  - Job search habits                                   │  │  │
│  │  │  - Application patterns                                │  │  │
│  │  │  - Learning preferences                                │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │
┌────────────────────────────────▼─────────────────────────────────────┐
│                    Business Logic Layer (Tools)                     │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   Job        │  │ Application  │  │   Mock AI    │            │
│  │   Service    │  │   Service    │  │  Interview   │            │
│  │   (Tool)     │  │   (Tool)     │  │   Service    │            │
│  │              │  │              │  │   (Tool)     │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   Profile    │  │   Learning   │  │ Notification │            │
│  │   Service    │  │   Service    │  │   Service    │            │
│  │   (Tool)     │  │   (Tool)     │  │   (Tool)     │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │
┌────────────────────────────────▼─────────────────────────────────────┐
│                        Data & Storage Layer                         │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  PostgreSQL  │  │  Vector DB   │  │   Redis      │            │
│  │  (Structured │  │  (Embeddings)│  │   (Cache,    │            │
│  │   Data,      │  │  - RAG docs  │  │   Memory,    │            │
│  │   Memory)    │  │  - Episodic  │  │   Pub/Sub)   │            │
│  │              │  │  - Semantic  │  │              │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐                              │
│  │ Elasticsearch│  │   S3/GCS     │                              │
│  │  (Job Search)│  │  (Documents) │                              │
│  └──────────────┘  └──────────────┘                              │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │
┌────────────────────────────────▼─────────────────────────────────────┐
│                      External Services                              │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   OpenAI/    │  │   Retell AI  │  │   Gemini AI  │            │
│  │   Gemini     │  │   (Voice)    │  │   (LLM)      │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Design

### 3.1 Orchestrator Agent (Supervisor)

#### 3.1.1 Responsibilities

- Task decomposition: Break complex requests into subtasks
- Agent selection: Choose appropriate specialized agents
- Workflow orchestration: Manage multi-step processes using LangGraph
- Tool routing: Route tool calls to business services
- Response synthesis: Combine agent outputs into coherent responses
- Error recovery: Handle failures and retries
- Context management: Maintain conversation context across agents

#### 3.1.2 Key Components

**Task Decomposer**

- Analyzes user intent and entities from Botpress
- Breaks complex queries into atomic tasks
- Identifies dependencies between tasks
- Creates execution plan

**Agent Router**

- Maintains registry of available agents
- Selects agents based on task type
- Supports parallel and sequential execution
- Handles agent handoffs

**Workflow Engine (LangGraph)**

- State machine for multi-step workflows
- Conditional branching based on agent outputs
- Parallel task execution
- Loop detection and prevention
- State persistence

**Response Synthesizer**

- Aggregates outputs from multiple agents
- Resolves conflicts between agent responses
- Generates natural language explanations
- Formats for Botpress

#### 3.1.3 Example Workflow

```
User: "Find me a React job and help me prepare for the interview"

Orchestrator:
  1. Decompose:
     - Task 1: Find React jobs (JobMatchAgent)
     - Task 2: Prepare interview (InterviewAgent)

  2. Execute:
     - Parallel: JobMatchAgent.search() + InterviewAgent.prepare()

  3. Synthesize:
     - Combine job results + interview prep
     - Generate unified response
```

---

### 3.2 Specialized Agents

#### 3.2.1 JobMatchAgent

**Purpose**: Intelligent job matching with explainable recommendations

**Capabilities**:

- Semantic job search using RAG
- Multi-criteria matching (skills, location, salary, culture)
- Explainable match scores
- Job ranking and filtering
- Company research integration

**Tools**:

- `searchJobs(filters)` - Job Service
- `getJobDetails(jobId)` - Job Service
- `getCompanyInfo(companyId)` - Company Service
- `retrieveJobContext(query)` - JobMatch RAG

**RAG Knowledge Base**:

- Job descriptions corpus
- Company information
- Industry trends
- Salary benchmarks

**Memory Usage**:

- Semantic: User job preferences
- Episodic: Past job searches and applications
- Procedural: Search patterns

#### 3.2.2 CareerCoachAgent

**Purpose**: Personalized career guidance and skill gap analysis

**Capabilities**:

- Career path planning
- Skill gap analysis
- Learning recommendations
- Career progression suggestions
- Industry trend analysis

**Tools**:

- `getUserProfile(userId)` - Profile Service
- `getLearningResources(skills)` - Learning Service
- `analyzeSkillGaps(profile, targetRole)` - Custom logic
- `retrieveCareerGuidance(query)` - Career RAG

**RAG Knowledge Base**:

- Career guides
- Skill adjacency maps
- Industry progression patterns
- Success stories

**Memory Usage**:

- Semantic: Career goals, skills, experience
- Episodic: Career conversations, decisions
- Procedural: Career planning patterns

#### 3.2.3 InterviewAgent

**Purpose**: Interview preparation and mock interview creation

**Capabilities**:

- Generate practice questions
- Create mock interview sessions
- Provide interview tips
- Role-specific preparation
- Real-time interview coaching

**Tools**:

- `createMockInterview(params)` - Mock Interview Service
- `generateQuestions(role, level)` - Mock Interview Service
- `getInterviewHistory(userId)` - Mock Interview Service
- `retrieveInterviewResources(query)` - Interview RAG

**RAG Knowledge Base**:

- Interview question banks
- Role-specific patterns
- Best practices
- Common mistakes

**Memory Usage**:

- Episodic: Past interview sessions and feedback
- Semantic: Interview preferences, strengths/weaknesses
- Procedural: Interview preparation patterns

#### 3.2.4 ApplicationStatusAgent

**Purpose**: Track applications and provide predictive insights

**Capabilities**:

- Application status tracking
- Timeline predictions
- Next steps recommendations
- Status change notifications
- Application analytics

**Tools**:

- `getUserApplications(userId)` - Application Service
- `getApplicationDetails(appId)` - Application Service
- `retrieveStatusContext(query)` - Application RAG
- `sendNotification(userId, message)` - Notification Service

**RAG Knowledge Base**:

- Application process documentation
- Status meaning guides
- Timeline expectations
- Best practices

**Memory Usage**:

- Episodic: Application history
- Semantic: Application preferences
- Procedural: Application patterns

#### 3.2.5 ResearchAgent

**Purpose**: Knowledge retrieval and FAQ handling

**Capabilities**:

- FAQ answering
- Knowledge base search
- Document retrieval
- Multi-source research
- Context-aware responses

**Tools**:

- `retrieveFAQ(query)` - Knowledge Base RAG
- `searchKnowledgeBase(query)` - Knowledge Base RAG
- `getDocument(docId)` - Document Service

**RAG Knowledge Base**:

- FAQs
- Company policies
- Process documentation
- General knowledge

#### 3.2.6 ProactiveAgent

**Purpose**: Event-driven proactive intelligence

**Capabilities**:

- Monitor events (new jobs, status changes, etc.)
- Generate proactive suggestions
- Send notifications
- Detect opportunities
- Trigger workflows

**Event Triggers**:

- New job matching user profile
- Application status change
- Skill gap detected
- Interview scheduled
- Career milestone reached
- Weekly insights

**Tools**:

- `sendNotification(userId, message)` - Notification Service
- `getUserProfile(userId)` - Profile Service
- `searchJobs(filters)` - Job Service
- All other agent tools (via Orchestrator)

---

### 3.3 Agent Communication Layer

#### 3.3.1 Agent-to-Agent Messaging

**Message Bus**: Redis Pub/Sub or RabbitMQ

**Message Format**:

```typescript
{
  from: "JobMatchAgent",
  to: "CareerCoachAgent",
  type: "request" | "response" | "notification",
  taskId: "uuid",
  payload: {...},
  context: {...}
}
```

**Use Cases**:

- Agent collaboration on complex tasks
- Sharing context between agents
- Parallel task coordination
- Result aggregation

#### 3.3.2 Tool Registry & Routing

**Tool Schema** (OpenAI Function Calling format):

```typescript
{
  name: "searchJobs",
  description: "Search for jobs matching criteria",
  parameters: {
    type: "object",
    properties: {
      skills: { type: "array", items: { type: "string" } },
      location: { type: "string" },
      salaryMin: { type: "number" }
    },
    required: ["skills"]
  }
}
```

**Tool Registry**:

- Central registry of all available tools
- Tool discovery by agents
- Tool execution routing
- Result aggregation
- Error handling

---

### 3.4 Long-Term Memory System

#### 3.4.1 Episodic Memory

**Storage**: Vector DB (semantic search) + PostgreSQL (structured)

**Content**:

- Past conversations (embeddings)
- User actions (applied, saved, viewed jobs)
- Interaction patterns
- Decision history

**Retrieval**:

- Semantic search for similar past interactions
- Time-based queries
- Context-aware retrieval

**Example**:

```
User: "Show me jobs like the one I applied to last week"
→ Episodic memory: Retrieve last week's application
→ Semantic search: Find similar jobs
```

#### 3.4.2 Semantic Memory

**Storage**: Vector DB + PostgreSQL

**Content**:

- User preferences (job type, location, salary)
- Skills and experience
- Career goals
- Learning preferences
- Communication style

**Structure**:

```typescript
{
  userId: string,
  preferences: {
    jobTypes: string[],
    locations: string[],
    salaryRange: { min, max },
    workStyle: string
  },
  skills: string[],
  experience: {...},
  goals: {...}
}
```

#### 3.4.3 Procedural Memory

**Storage**: PostgreSQL + Redis

**Content**:

- User behavior patterns
- Job search habits
- Application patterns
- Learning preferences
- Interaction frequency

**Usage**:

- Predict user needs
- Personalize responses
- Optimize workflows

---

### 3.5 Agent-Scoped RAG Services

#### 3.5.1 JobMatch RAG

**Knowledge Base**:

- Job descriptions (chunked by section)
- Company information
- Industry trends
- Salary data
- Skills requirements

**Retrieval Strategy**:

- Hybrid search (vector + keyword)
- Metadata filtering (location, salary, skills)
- Re-ranking by relevance

#### 3.5.2 Career RAG

**Knowledge Base**:

- Career guides
- Skill adjacency maps
- Industry progression patterns
- Success stories
- Market trends

**Retrieval Strategy**:

- Role-based retrieval
- Skill-based filtering
- Progression pattern matching

#### 3.5.3 Interview RAG

**Knowledge Base**:

- Interview question banks
- Role-specific patterns
- Best practices
- Common mistakes
- STAR method examples

**Retrieval Strategy**:

- Role-based filtering
- Question type classification
- Difficulty level matching

#### 3.5.4 Application RAG

**Knowledge Base**:

- Application process docs
- Status meaning guides
- Timeline expectations
- Best practices
- FAQ

**Retrieval Strategy**:

- Status-based retrieval
- Process step matching
- FAQ similarity search

#### 3.5.5 Knowledge Base RAG

**Knowledge Base**:

- General FAQs
- Company policies
- Process documentation
- Help articles

**Retrieval Strategy**:

- General semantic search
- Category filtering
- Multi-source aggregation

---

## 4. Use Case Flows (AI-Native)

### 4.1 Use Case: Intelligent Job Discovery

**Flow Diagram**:

```
User: "Find me React developer jobs in Ho Chi Minh City"
    ↓
Botpress: Intent = job_search, Entities = {skill: "React", location: "Ho Chi Minh City"}
    ↓
Backend Webhook: POST /v1/botpress/webhook
    ↓
BotpressIntegrationService.preprocess()
    ↓
OrchestratorAgent.decomposeTask()
    ├──→ Task: job_search
    ├──→ Entities: {skill: "React", location: "HCMC"}
    └──→ Context: {userId, sessionId}
    ↓
OrchestratorAgent.selectAgent() → JobMatchAgent
    ↓
JobMatchAgent.execute()
    ├──→ Retrieve Semantic Memory (user preferences)
    ├──→ Retrieve Episodic Memory (past searches)
    │
    ├──→ JobMatch RAG.retrieveJobContext()
    │       ├──→ Vector Search: "React developer jobs Ho Chi Minh City"
    │       ├──→ Retrieve similar job descriptions
    │       ├──→ Get company information
    │       └──→ Extract filters: {skills: ["React"], location: "HCMC"}
    │
    ├──→ Tool: JobService.search(filters)
    │       └──→ Return matching jobs from PostgreSQL
    │
    ├──→ Tool: JobMatchAgent.rankJobs(jobs, userProfile)
    │       ├──→ Use LLM to score matches
    │       ├──→ Consider user preferences from Semantic Memory
    │       └──→ Generate explainable scores
    │
    └──→ JobMatchAgent.explainMatches(jobs, scores)
            ├──→ Use LLM with RAG context
            ├──→ Generate personalized explanations
            └──→ Include why each job matches
    ↓
OrchestratorAgent.synthesize()
    ├──→ Format response
    ├──→ Add suggestions
    └──→ Update Episodic Memory (this search)
    ↓
Response to Botpress:
{
  type: "job_list",
  explanation: "I found 5 React developer positions that match your profile...",
  data: [...jobs with match scores],
  matchReasons: {
    job1: "Strong match: 3 years NestJS experience aligns with Node.js requirements...",
    ...
  },
  suggestions: ["Filter by experience", "View company culture", "Save for later"]
}
    ↓
Botpress: Display job cards with explanations
```

**AI-Native Enhancements**:

- Uses Semantic Memory for personalization
- Uses Episodic Memory to avoid repeating past suggestions
- Explainable match scores via LLM
- Multi-step reasoning (search → rank → explain)

---

### 4.2 Use Case: Proactive Job Recommendation

**Flow Diagram**:

```
Event: New job posted matching user profile
    ↓
ProactiveAgent.monitorEvents()
    ├──→ Detect: New job matches user preferences
    └──→ Trigger: ProactiveAgent.analyzeOpportunity()
    ↓
ProactiveAgent.execute()
    ├──→ Retrieve Semantic Memory (user preferences, skills)
    ├──→ Retrieve Episodic Memory (recent applications, views)
    │
    ├──→ Request: JobMatchAgent.analyzeMatch(job, userProfile)
    │       ├──→ Calculate match score
    │       ├──→ Identify why it's a good fit
    │       └──→ Check if user already viewed/applied
    │
    └──→ If high match score and not viewed:
            ├──→ Generate personalized message
            ├──→ Tool: NotificationService.send()
            └──→ Update Episodic Memory
    ↓
User receives notification:
"🎯 New opportunity: Senior React Developer at TechCorp
   Strong match (92%): Your 3 years NestJS experience aligns perfectly.
   Skills match: React, TypeScript, Node.js
   [View Job] [Save] [Dismiss]"
```

**AI-Native Enhancements**:

- Event-driven proactive intelligence
- Uses memory to avoid spam
- Personalized messaging
- Multi-agent collaboration

---

### 4.3 Use Case: Multi-Step Career Planning

**Flow Diagram**:

```
User: "Help me plan my career path to become a Senior Backend Engineer"
    ↓
Botpress: Intent = career_path, Entities = {targetRole: "Senior Backend Engineer"}
    ↓
OrchestratorAgent.decomposeTask()
    ├──→ Task 1: Analyze current state (CareerCoachAgent)
    ├──→ Task 2: Identify skill gaps (CareerCoachAgent)
    ├──→ Task 3: Create learning plan (CareerCoachAgent + Learning Service)
    └──→ Task 4: Generate timeline (CareerCoachAgent)
    ↓
OrchestratorAgent.createWorkflow() [LangGraph]
    State: START
        ↓
    State: ANALYZE_CURRENT
        ├──→ CareerCoachAgent.getCurrentState()
        │       ├──→ Tool: ProfileService.getUserProfile()
        │       ├──→ Retrieve Semantic Memory (skills, experience)
        │       └──→ Retrieve Episodic Memory (career history)
        ↓
    State: IDENTIFY_GAPS
        ├──→ CareerCoachAgent.analyzeSkillGaps()
        │       ├──→ Career RAG.retrieveRoleRequirements("Senior Backend Engineer")
        │       ├──→ Compare with user profile
        │       └──→ Generate gap analysis
        ↓
    State: CREATE_LEARNING_PLAN
        ├──→ CareerCoachAgent.createLearningPlan()
        │       ├──→ Tool: LearningService.getResources(skills)
        │       ├──→ Career RAG.retrieveLearningPaths()
        │       └──→ Generate personalized plan
        ↓
    State: GENERATE_TIMELINE
        ├──→ CareerCoachAgent.generateTimeline()
        │       ├──→ Consider user's learning pace (Procedural Memory)
        │       ├──→ Career RAG.retrieveProgressionPatterns()
        │       └──→ Generate realistic timeline
        ↓
    State: SYNTHESIZE
        └──→ OrchestratorAgent.synthesize()
                ├──→ Combine all outputs
                ├──→ Generate comprehensive response
                └──→ Update Semantic Memory (career goals)
    ↓
Response to Botpress:
{
  type: "career_path",
  currentState: {
    role: "Backend Engineer",
    skills: ["Node.js", "PostgreSQL", "REST APIs"],
    experience: "2 years"
  },
  targetState: {
    role: "Senior Backend Engineer",
    requiredSkills: ["System Design", "Microservices", "Kubernetes", ...]
  },
  skillGaps: [
    { skill: "System Design", priority: "high", gap: "medium" },
    { skill: "Kubernetes", priority: "medium", gap: "high" },
    ...
  ],
  learningPlan: [
    {
      phase: "Phase 1 (Months 1-3)",
      skills: ["System Design"],
      resources: [...],
      milestones: [...]
    },
    ...
  ],
  timeline: {
    estimatedMonths: 12,
    milestones: [...]
  },
  explanation: "Based on your current experience..."
}
```

**AI-Native Enhancements**:

- Multi-step workflow orchestration (LangGraph)
- Uses all three memory types
- Multi-agent coordination
- Personalized based on user history

---

### 4.4 Use Case: Intelligent Mock Interview Creation

**Flow Diagram**:

```
User: "Create a mock interview for Senior Backend Engineer"
    ↓
OrchestratorAgent.decomposeTask()
    ├──→ Task 1: Get user profile (Profile Service)
    ├──→ Task 2: Retrieve job context (JobMatch RAG)
    ├──→ Task 3: Generate questions (InterviewAgent)
    └──→ Task 4: Create session (Mock Interview Service)
    ↓
OrchestratorAgent.execute() [Parallel]
    ├──→ InterviewAgent.execute()
    │       ├──→ Retrieve Semantic Memory (user skills, experience)
    │       ├──→ Retrieve Episodic Memory (past interviews, weak areas)
    │       │
    │       ├──→ Interview RAG.retrieveJobContext("Senior Backend Engineer")
    │       │       ├──→ Get job descriptions
    │       │       ├──→ Extract technical areas
    │       │       └──→ Get interview patterns
    │       │
    │       ├──→ InterviewAgent.generateQuestions()
    │       │       ├──→ Use LLM with RAG context
    │       │       ├──→ Consider user's experience level
    │       │       ├──→ Focus on weak areas (from Episodic Memory)
    │       │       └──→ Generate adaptive questions
    │       │
    │       └──→ Tool: MockInterviewService.createSession()
    │               └──→ Create interview session
    │
    └──→ JobMatchAgent.retrieveJobContext() [Parallel]
            └──→ Get relevant job descriptions for context
    ↓
OrchestratorAgent.synthesize()
    ├──→ Combine interview session + context
    └──→ Generate personalized description
    ↓
Response to Botpress:
{
  type: "mock_interview_created",
  sessionId: "...",
  callUrl: "...",
  description: "I've created a Senior Backend Engineer mock interview focusing on System Design and Microservices, areas where you can improve based on your past sessions.",
  focusAreas: ["System Design", "Microservices", "Distributed Systems"],
  difficulty: "intermediate-to-advanced",
  estimatedDuration: "45 minutes"
}
```

**AI-Native Enhancements**:

- Uses Episodic Memory to focus on weak areas
- Adaptive question generation
- Multi-agent parallel execution
- Personalized based on history

---

## 5. Workflow Orchestration (LangGraph)

### 5.1 LangGraph State Machine

**State Definition**:

```typescript
interface WorkflowState {
  userId: string;
  task: string;
  intent: string;
  entities: Record<string, any>;
  agentOutputs: Record<string, any>;
  context: Record<string, any>;
  currentStep: string;
  completedSteps: string[];
  errors: Error[];
}
```

**Example Workflow: Complex Job Search with Career Advice**

```
START
  ↓
[Node: DecomposeTask]
  ├──→ Analyze intent
  ├──→ Extract entities
  └──→ Create task plan
  ↓
[Node: RetrieveMemory]
  ├──→ Get Semantic Memory
  ├──→ Get Episodic Memory
  └──→ Get Procedural Memory
  ↓
[Conditional: TaskType]
  ├──→ If "job_search" → JobMatchAgent
  ├──→ If "career_advice" → CareerCoachAgent
  └──→ If "both" → Parallel execution
  ↓
[Node: JobMatchAgent] (if needed)
  ├──→ Search jobs
  ├──→ Rank matches
  └──→ Explain results
  ↓
[Node: CareerCoachAgent] (if needed)
  ├──→ Analyze profile
  ├──→ Provide advice
  └──→ Suggest improvements
  ↓
[Node: Synthesize]
  ├──→ Combine outputs
  ├──→ Resolve conflicts
  └──→ Generate response
  ↓
[Node: UpdateMemory]
  ├──→ Update Episodic Memory
  └──→ Update Semantic Memory (if needed)
  ↓
END
```

### 5.2 Error Recovery

**Retry Logic**:

- Exponential backoff for transient errors
- Fallback to simpler workflows
- Graceful degradation

**Error Handling**:

```typescript
if (agentFails) {
  → Try alternative agent
  → Use cached results
  → Fallback to template response
}
```

---

## 6. Technology Stack

### 6.1 Core Technologies

| Component             | Technology                                                     | Rationale                         |
| --------------------- | -------------------------------------------------------------- | --------------------------------- |
| **Backend Framework** | NestJS                                                         | Already in use                    |
| **Orchestration**     | LangGraph (Python) or LangGraph.js (TypeScript)                | Multi-step workflow orchestration |
| **RAG Framework**     | LangChain                                                      | Industry standard, good ecosystem |
| **Vector Database**   | Pinecone (Production) / pgvector (MVP)                         | Scalable, managed option          |
| **Embeddings**        | OpenAI text-embedding-3-small or Gemini embeddings             | Good quality, cost-effective      |
| **LLM**               | Gemini 2.5 Flash / GPT-4                                       | Already integrated                |
| **Memory**            | Redis (cache) + Vector DB (semantic) + PostgreSQL (structured) | Multi-layer memory                |
| **Message Bus**       | Redis Pub/Sub or RabbitMQ                                      | Agent-to-agent communication      |
| **Cache**             | Redis                                                          | Session, response caching         |
| **Database**          | PostgreSQL                                                     | Existing infrastructure           |

### 6.2 Agent Framework Options

**Option 1: LangGraph + LangChain** (Recommended)

- Pros: Industry standard, good documentation, Python/JS support
- Cons: Learning curve

**Option 2: CrewAI**

- Pros: Built for multi-agent systems, easy setup
- Cons: Less flexible, newer

**Option 3: Custom (NestJS-based)**

- Pros: Full control, TypeScript-native
- Cons: More development effort

---

## 7. Implementation Phases

### Phase 1: Foundation + MVP (Weeks 1-4)

**Week 1-2: Core Infrastructure**

- Set up Botpress integration module
- Implement basic webhook handler
- Set up authentication flow
- Create basic response formatting

**Week 3-4: RAG Infrastructure**

- Set up vector database
- Implement document ingestion pipeline
- Create basic RAG service
- Ingest initial knowledge base

**Deliverable**: Basic RAG-powered chatbot

---

### Phase 2: Orchestrator + Single Agent (Weeks 5-8)

**Week 5-6: Orchestrator Agent**

- Implement OrchestratorAgent
- Set up LangGraph workflow engine
- Create task decomposition logic
- Implement agent routing

**Week 7-8: First Specialized Agent (JobMatchAgent)**

- Implement JobMatchAgent
- Create JobMatch RAG service
- Set up tool registry
- Integrate with Orchestrator

**Deliverable**: Orchestrator + JobMatchAgent working

---

### Phase 3: Memory System (Weeks 9-10)

**Week 9: Memory Infrastructure**

- Implement Episodic Memory
- Implement Semantic Memory
- Set up memory retrieval
- Create memory update logic

**Week 10: Memory Integration**

- Integrate memory with agents
- Test memory retrieval
- Optimize memory queries

**Deliverable**: Long-term memory system operational

---

### Phase 4: Additional Agents (Weeks 11-14)

**Week 11-12: CareerCoachAgent + InterviewAgent**

- Implement CareerCoachAgent
- Implement InterviewAgent
- Create respective RAG services
- Integrate with Orchestrator

**Week 13-14: ApplicationStatusAgent + ResearchAgent**

- Implement ApplicationStatusAgent
- Implement ResearchAgent
- Create respective RAG services
- Integrate with Orchestrator

**Deliverable**: All core agents operational

---

### Phase 5: Proactive Intelligence (Weeks 15-16)

**Week 15: ProactiveAgent**

- Implement ProactiveAgent
- Set up event monitoring
- Create notification triggers
- Test proactive suggestions

**Week 16: Event System**

- Set up event bus
- Create event handlers
- Implement event-driven workflows

**Deliverable**: Proactive intelligence operational

---

### Phase 6: Optimization & Polish (Weeks 17-20)

**Week 17-18: Performance**

- Optimize RAG retrieval
- Implement caching strategies
- Optimize memory queries
- Load testing

**Week 19: Monitoring & Observability**

- Set up agent monitoring
- Track agent performance
- Monitor memory usage
- Alerting

**Week 20: Testing & Refinement**

- End-to-end testing
- User testing
- Refinement based on feedback
- Documentation

**Deliverable**: Production-ready AI-native system

---

## 8. Success Criteria

### 8.1 Functional

- All 6+ agents implemented and working
- Orchestrator handles complex multi-step tasks
- Long-term memory improves personalization over time
- Proactive suggestions are relevant and timely
- RAG provides relevant context in 85%+ of cases
- Response time < 3 seconds for 95% of requests

### 8.2 Quality

- User satisfaction score > 4.5/5
- Intent recognition accuracy > 92%
- Agent selection accuracy > 90%
- Memory retrieval relevance > 85%
- Error rate < 1.5%

### 8.3 Performance

- System handles 2000+ concurrent users
- RAG retrieval < 400ms
- LLM generation < 2s
- Memory retrieval < 200ms
- Agent orchestration overhead < 500ms

### 8.4 AI-Native Metrics

- Multi-step task completion rate > 80%
- Proactive suggestion acceptance rate > 30%
- Memory-based personalization improvement > 25%
- Agent collaboration success rate > 85%

---

## 9. Key Differences from Original Design

### 9.1 Architecture Changes

| Original                                 | AI-Native                                |
| ---------------------------------------- | ---------------------------------------- |
| Botpress → IntegrationService → Services | Botpress → Orchestrator → Agents → Tools |
| Single RAG service                       | Agent-scoped RAG services                |
| Session-only context                     | Long-term memory (3 types)               |
| Reactive only                            | Reactive + Proactive                     |
| Request/response                         | Multi-step workflows                     |
| No agent layer                           | Specialized agents                       |

### 9.2 New Components

1. **Orchestrator Agent**: Central supervisor
2. **Specialized Agents**: 6+ domain-specific agents
3. **Long-Term Memory**: Episodic, Semantic, Procedural
4. **Proactive Agent**: Event-driven intelligence
5. **Workflow Engine**: LangGraph for multi-step tasks
6. **Tool Registry**: Standardized tool interface
7. **Agent Communication**: Message bus for coordination

### 9.3 Enhanced Capabilities

- Multi-step reasoning
- Proactive suggestions
- Personalized responses (memory-based)
- Explainable recommendations
- Adaptive behavior
- Agent collaboration

---

This design transforms the system into an AI-native, multi-agent architecture while maintaining the solid foundation of the original design. It addresses all gaps identified in the critique and provides a clear path to implementation.
