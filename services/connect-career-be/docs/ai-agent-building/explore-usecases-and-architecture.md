Here’s a **complete, practical blueprint** for building a chatbot that supports **both candidates and recruiters**, with **every meaningful use case**, plus **how to implement each one** in your architecture (LangGraph + RAG + tools + memory).

No sugar-coating — straight to the point.

---

# 🎯 1. Two personas → one chatbot

Your assistant must adapt to **two roles**:

### **Candidate**

- Looking for jobs
- Parsing CV
- Comparing jobs
- Getting career advice
- Practice interview
- Track application status

### **Recruiter**

- Writing job posts
- Screening candidates
- Comparing candidates
- Asking the bot to search/filter
- Interview question generation
- Talent pool insights

You **must detect the role automatically**, unless user chooses explicitly.

### Implementation

- Add `role` to `AgentState`:

```python
role: Literal["candidate", "recruiter"]
```

- Implement a **RoleDetector Node** (simple LLM classifier):

```text
"I want to find a backend job" → candidate
"I need to hire a frontend developer" → recruiter
```

The router then branches usecases differently.

---

# 🧠 2. Full list of use cases your chatbot should support

This is the most complete real-world list you’ll find.

---

## 🧑‍💼 Candidate Use Cases

### 1. Job Discovery & Matching

- Recommend jobs based on skills, experience, or CV
- "Show me jobs that fit my CV"
- "Match me with jobs requiring Python + AWS"

**Implementation**

- Embedding candidate profile into `pgvector`
- Query jobs using similarity search
- Node: `CANDIDATE_MATCHING_NODE`

---

### 2. CV Parsing

- Extract skills, experience, education
- Auto-fill profile
- Identify missing information

**Implementation**

- Tool: `parse_cv`
- Model: Gemini 2.0 Flash / GPT-4o Mini + structured output
- Node: `CV_PARSER_NODE`

---

### 3. CV Improvement

- Rewrite CV
- Suggest quantification ("improve metrics")
- Optimize for ATS

**Implementation**

- Prompt engineering using chain-of-thought
- Memory stores CV version history

---

### 4. Career Guidance

- “What jobs fit someone with my background?”
- “How to transition to AI?”

**Implementation**

- Custom LLM template + skill gap analysis results

---

### 5. Skill Gap Detection

- Compare candidate skills vs job requirements

**Implementation**

- Tool: `compute_skill_gap(job_description, cv_text)`
- Produces structured object:

```
{
  matched_skills: [...],
  missing_skills: [...],
  suggested_courses: [...]
}
```

---

### 6. Interview Prep

- Mock interviews
- Behavioral questions
- Evaluate candidate responses

**Implementation**

- Multi-turn subgraph for Q&A loop
- Evaluation node scoring answers

---

### 7. Application Tracking

- “Did company X check my CV yet?”
- “What’s my application status?”

**Implementation**

- Query backend API directly:
  `GET /applications/{user_id}`

---

### 8. Job Comparison

- “Compare job A vs job B”
- Salary
- Tech stack
- Responsibilities

**Implementation**

- `comparison_node` builds a table
- Use structured LLM output

---

---

## 🧑‍💼 Recruiter Use Cases

### 1. Create Job Posting

- Recruiter describes a need
- Chatbot produces a polished job description
- Chatbot ensures clarity + requirements + responsibilities

**Implementation**

- Template filling node: `JOB_POST_GENERATOR_NODE`
- Memory stores draft history

---

### 2. Rewrite / Optimize Job Posting

- Fix wording
- Make ATS-friendly
- Add missing qualifications
- Improve clarity

---

### 3. Parse Candidate CVs

- Extract core attributes
- Score candidates
- Summarize strengths/weaknesses

**Implementation**

- Reuse CV parser but use **recruiter mode prompts**
  (more critical, more structured, less empathetic)

---

### 4. Compare Candidates

- Multi-candidate comparison matrix:

```
rating_tech
rating_experience
rating_communication
culture_fit
risk_level
```

**Implementation**

- `CandidateComparisonNode`
- Structured output enforced via `JsonSchema`

---

### 5. Shortlist Generation

- "Give me the top 5 candidates for this role"
- Filter by skills, years, education

**Implementation**

- ElasticSearch → semantic + keyword filters
- LLM ranks and explains

---

### 6. Talent Pool Search

- Recruiter asks:
  “Find candidates with Golang + gRPC + 3 years exp”

**Implementation**

- Query vector + keyword search
- Node: `SEARCH_CANDIDATE_NODE`

---

### 7. Candidate Scorecard

- Automated scoring model:
  1. Skill match
  2. Domain experience
  3. Communication level
  4. Seniority level

**Implementation**

- Weighted scoring tool
- LLM explains final score

---

### 8. Interview Question Generator

- Technical questions
- Cultural questions
- Role-specific evaluation rubrics

**Implementation**

- Template system for prompts
- Recrutier mode ensures structure

---

### 9. Screening Summaries

- “Summarize this candidate for me”
- “Is this candidate worth interviewing?”

**Implementation**

- LLM summarization
- RAG with candidate’s full interviews, CV, notes

---

---

# 🧩 3. Architecture to support all use cases

Your graph should look like this:

```
START
   ├── ROLE_DETECTOR
   ├── INTENT_ROUTER
   │      ├── CANDIDATE_FLOW (subgraph)
   │      └── RECRUITER_FLOW (subgraph)
   │
   └── CONTEXT_ANALYZER
          ↓
      CONTEXT_BUILDER
          ↓
        ANSWER
          ↓
         END
```

### Role branches:

#### **Candidate Subgraph**

- CV_PARSER_NODE
- JOB_MATCHING_NODE
- JOB_COMPARISON_NODE
- CAREER_ADVICE_NODE
- INTERVIEW_PRACTICE_NODE

#### **Recruiter Subgraph**

- JOB_POST_GENERATOR_NODE
- CANDIDATE_SEARCH_NODE
- CANDIDATE_SUMMARY_NODE
- CANDIDATE_COMPARISON_NODE
- SHORTLIST_GENERATOR_NODE

---

# 🔧 4. Tools required (UX critical)

| Tool                           | Purpose                        |
| ------------------------------ | ------------------------------ |
| `parse_cv`                     | CV → structured JSON           |
| `search_jobs`                  | Query Elasticsearch / Postgres |
| `search_candidates`            | Semantic candidate search      |
| `compare_candidates`           | Build comparison matrix        |
| `score_candidate`              | Produce numeric scoring model  |
| `rewrite_job_post`             | Improve recruiter’s job post   |
| `generate_interview_questions` | Recruiter mode                 |
| `evaluate_interview_answer`    | Candidate mode                 |

---

# 🧠 5. Memory Model

You need **three layers**:

### 1. **Episodic Memory**

Conversation history, recent turns.

### 2. **Profile Memory**

Candidate:

- skills
- career preferences
- CV embeddings

Recruiter:

- hiring roles
- job postings
- previously reviewed candidates

### 3. **Semantic Memory (vector)**

- CV embeddings
- job embeddings
- recruiter notes

### 4. **Long-term Knowledge Memory**

- FAQs
- hiring process rules
- interview guidelines

---

# ⚙️ 6. Database Layer

You must design tables:

```
candidate_profiles
candidate_embeddings
job_posts
job_embeddings
applications
cv_parsed_data
conversation_sessions
conversation_messages
recruiter_profiles
```

---

# 🚀 7. Implementation plan (practical)

## Step 1 — Build router + role detector

- LLM classification
- Use structured output

## Step 2 — Implement candidate subgraph

- CV parsing
- Job matching
- Comparison logic
- Interview module

## Step 3 — Implement recruiter subgraph

- Job post generator
- CV parser (strict evaluator)
- Candidate filtering
- Candidate scoring
- Shortlisting

## Step 4 — Add tools

Attach tool functions via:

```python
llm.bind_tools([parse_cv, search_jobs, ...])
```

## Step 5 — Add RAG layer

- Embed CV + job postings
- Hybrid search (BM25 + vector)

## Step 6 — Implement memory layer

Store user profile + embeddings + chat history.

## Step 7 — Deploy multi-agent pipeline with LangGraph

Each usecase = node
Each persona = subgraph

---
