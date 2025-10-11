# Premium Feature Plan — Connect‑Career (EN)

> A premium monetization blueprint for three roles (Candidate / Employer / Admin) with plan tiers, pricing examples, entitlement & metering architecture, AI feature design, moderation, analytics, and rollout roadmap.

---

## 0) Goals & Principles

- **Grow revenue** via Subscriptions + Usage (credits) + Add‑ons (Boost, contact unlock, AI minutes).
- **Improve match rates**: AI CV scoring, two‑sided recommendations, mock interviews.
- **Smooth UX**: clear paywalls, 1‑click upgrade, transparent usage counters.
- **Security & compliance**: audit trails, privacy‑first, bias minimization.

---

## 1) Plans & Pricing (example values for VN market)

> Prices are **illustrative** for A/B testing later. Currency: VND/month.

### 1.1 Candidate

| Feature                                                           |      Free |           Plus (~₫49k) |              Pro (~₫99k) |
| ----------------------------------------------------------------- | --------: | ---------------------: | -----------------------: |
| Create / Edit profile                                             |        ✔️ |                     ✔️ |                       ✔️ |
| Upload CV (versions)                                              |         1 |                      5 |                        ∞ |
| **AI CV Scoring**                                                 |   3/month |                     20 |             ∞ (fair‑use) |
| **AI CV Improvement**                                             |   3/month |                     20 |             ∞ (fair‑use) |
| **Profile 360°** (aggregate CV, skills, prior recruiter feedback) |         — |                  Basic |          Full + insights |
| Job search                                                        |        ✔️ |                     ✔️ |                       ✔️ |
| Personalized job recommendations                                  |     Basic | Enhanced (24h refresh) |   Real‑time (6h refresh) |
| Save jobs                                                         |        10 |                    200 |                        ∞ |
| Apply online & track status                                       |        ✔️ |    ✔️ (with reminders) | ✔️ + pass‑rate analytics |
| Recruiter feedback                                                |        ✔️ |                     ✔️ |                       ✔️ |
| **Interview scheduling** (calendar sync)                          |         — |                     ✔️ |       ✔️ + SMS reminders |
| **Real‑time notifications**                                       |        ✔️ |                     ✔️ |              ✔️ priority |
| **AI Mock interview**                                             |         — |       2 sessions/month |        10 sessions/month |
| Employer reviews                                                  |        ✔️ |                     ✔️ |                       ✔️ |
| **Chat with employer**                                            | Daily cap |             Higher cap |                        ∞ |
| **Career‑advice chatbot**                                         |     Basic |                    Pro |       Pro+ (case review) |

**Candidate Add‑ons:**

- Extra mock‑interview packs (5/10), expert CV review (human‑in‑the‑loop), premium CV templates, LinkedIn profile review.

---

### 1.2 Employer

| Feature                                                            |             Free | Starter (~₫499k) |  Growth (~₫1.99M) |     Scale (~₫4.99M) |
| ------------------------------------------------------------------ | ---------------: | ---------------: | ----------------: | ------------------: |
| Create / Update company profile                                    |               ✔️ |               ✔️ |                ✔️ |                  ✔️ |
| **Active job postings**                                            |                1 |                5 |                25 |                 100 |
| Edit job posts                                                     |               ✔️ |               ✔️ |                ✔️ |                  ✔️ |
| **AI Job Description generation**                                  |           3 runs |              100 |               500 |                2000 |
| **Candidate search**                                               | 20 profile views |              200 |              2000 |               10000 |
| **Contact unlocks** (email/phone)                                  |                0 |               10 |               100 |                 500 |
| **AI candidate recommendations**                                   |            Basic |         Advanced |          Advanced |          Enterprise |
| **Auto‑filtering** (skills/degree/experience)                      |                — |               ✔️ |                ✔️ |                  ✔️ |
| **Matching Score %** + explanations                                |            Basic |         Advanced |          Advanced |            Advanced |
| Respond / Invite to interview                                      |               ✔️ |               ✔️ |                ✔️ |                  ✔️ |
| **Recruitment pipeline**                                           |            Basic | Pro (SLA, notes) | Pro+ (SLA alerts) |                Pro+ |
| **Interview scheduling** (GCal/O365)                               |                — |               ✔️ |                ✔️ |                  ✔️ |
| **Chat with candidates**                                           |       10 threads |              100 |              1000 |                   ∞ |
| **Real‑time notifications**                                        |               ✔️ |               ✔️ |       ✔️ priority |         ✔️ priority |
| **Recruiting dashboard** (CV throughput, pass rates, time‑to‑hire) |            Basic |              Pro |              Pro+ | Enterprise + export |
| **Billing & plan management**                                      |               ✔️ |               ✔️ |                ✔️ |                  ✔️ |

**Employer Add‑ons:**

- **Boost Job** (featured placement, email blast), **Contact bundles**, enhanced **Brand Page**, **Talent Pool CRM**.

---

### 1.3 Admin (non‑billable)

- User management, block/unblock; handle abuse reports; review & approve jobs and profiles; plan management, refunds; system dashboards.

---

## 2) Monetization Model

- **Subscriptions** by role (Candidate Plus/Pro; Employer Starter/Growth/Scale) — monthly/yearly.
- **Usage‑based metering**: AI calls (CV scoring, JD gen), contact unlocks, mock‑interview minutes.
- **Add‑ons**: Boost placements, bundles, expert services.
- **Payments**: Stripe (intl) and **MoMo/ZaloPay/VietQR** (VN). Support VAT invoicing.

---

## 3) Entitlement & Billing Architecture

### 3.1 Core entities

- `product` (candidate_premium, employer_plan), `price` (monthly, yearly), `plan_feature` (key + limits),
- `subscription` (user/org, status, current_period), `entitlement` (subject→feature→limit),
- `usage_counter` (subject, feature, period, used), `payment_transaction`, `invoice`.

### 3.2 Event‑driven (Outbox/Inbox)

- Events: `payment.succeeded` → `subscription.activated` → **(Re)build entitlements**.
- `usage.logged` (AI call, contact unlock) → **rate‑limit/quota enforcement**.

### 3.3 Runtime flow

1. API receives request → 2) **Guard** checks entitlement & quota → 3) write `usage_counter` → 4) execute.

#### NestJS Guard (minimal example)

```ts
@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(private ent: EntitlementService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const userId = req.user.id;
    const feature: FeatureKey = req.route.path; // map /ai/cv-score → FEATURE.AI_CV_SCORING
    const ok = await this.ent.checkAndConsume({ userId, feature, cost: 1 });
    if (!ok) throw new ForbiddenException('Upgrade required or quota exceeded');
    return true;
  }
}
```

#### Redis usage counter (period‑scoped)

```ts
// key: usage:{subject}:{feature}:{period}
INCRBY key cost
EXPIRE key seconds_until_period_end
```

---

## 4) AI & Ranking Design

### 4.1 AI CV Scoring (against a JD)

- **Inputs**: normalized JD (skills, seniority, industry, location), candidate profile (CV + fields).
- **Pipeline**:
  1. Normalization & **skill extraction** (NER/heuristics + dictionary), years of experience, education.
  2. **Hybrid similarity**: BM25 (JD→CV text) + embedding cosine (e5‑multilingual) → `sim_text`.
  3. **Rule features**: `skill_overlap`, `experience_gap`, `location_distance`, `language_level`, `salary_fit`.
  4. **Aggregate score** (example):

     ```text
     score = 0.35*sim_text + 0.35*skill_overlap + 0.15*experience_fit + 0.10*location_fit + 0.05*language_fit
     ```

  5. **LLM critique** (by plan): strengths/weaknesses + actionable edits.

- **Output**: 0–100 score + reasons + missing‑skills checklist.

### 4.2 AI CV Improvement

- Prompt sketch (condensed):
  - System: _“You are a career coach. Compare CV vs JD. Return (1) strengths/weaknesses, (2) concrete bullet suggestions, (3) a 2–3 sentence keyword‑optimized summary.”_
  - Tools: produce a **diff** between old/new CV.

### 4.3 Matching Score (Candidate↔Job)

- Show **percentage** with colored badge + tooltip for transparency.
- Features: `skill_overlap` (Jaccard / counts), `years_delta`, `title_similarity`, `industry_match`, `location/salary`, text & embedding similarity.
- Allow **RRF** re‑ranking over BM25 + embeddings + business rules.

### 4.4 Personalized Recommendations

- **Candidate→Jobs**: profile signals, click/apply/save history, **freshness** and **popularity**.
- **Employer→Candidates**: JD embedding + hard filters + re‑rank by prior interactions.
- **Online** features (Redis/PG JSONB), **offline** batch jobs (Spark/SQL).

### 4.5 Auto‑filtering

- Hard filters: skills/degree/experience; soft filters: minimum match score; provide **explanations** for filtered‑out profiles.

### 4.6 AI Mock Interviews

- Tracks: Behavioral + Technical; choose level/stack; limit **N sessions/month** by plan.
- **Rubric** scoring, transcript, and next‑step recommendations.

> **Ethics & legal:** Use **consent** before consuming prior recruiter feedback for Profile 360°. Do not expose sensitive attributes. Provide **opt‑out**.

---

## 5) Search, Messaging, Calendar & Notifications

- **Search**: Elasticsearch (BM25 + vectors), VI/EN analyzers, synonyms; RRF for stable relevance.
- **Messaging**: dedicated service (WS/SSE), conversation storage, rate‑limit by plan.
- **Calendar**: GCal/O365 integration (employer) + iCal; conflict checks; reminders.
- **Notifications**: in‑app + email + push (FCM). Topics per tenant/org.

---

## 6) Moderation & Abuse Reports

- States: `pending → investigating → actioned` (warn/suspend/remove).
- Signals: spam, deceptive JD, abusive behavior.
- **Audit log** for all admin actions; user **appeal** flow.

---

## 7) Dashboards & Analytics

- **Employer**: CVs/week, pass rates by stage, time‑to‑hire, source attribution.
- **Candidate**: view→apply rate, average fit score, impact of CV improvements.
- **Admin**: DAU/MAU, Free→Paid conversion, churn, ARPU, MRR.

Instrument **events**:

- `cv.scored`, `cv.improved`, `job.viewed`, `job.applied`, `message.sent`, `interview.scheduled`, `contact.unlocked`, `subscription.upgraded`.

---

## 8) Rollout Plan (phasing)

- **Phase 0 (Foundation)**: Auth, Org, Payments, Subscriptions, Entitlements, Usage counters, Notifications.
- **Phase 1 (Candidate Premium)**: AI CV Score/Improve, higher save‑limits, basic Mock Interview.
- **Phase 2 (Employer Pro)**: JD Gen, Candidate Search/Unlock, Auto‑filter, Pro Pipelines & Dashboards.
- **Phase 3 (Advanced AI)**: Explainable matching, near‑real‑time re‑rank, Profile 360° (consent), brand & boost.

---

## 9) Risks & Controls

- **Bias/Discrimination**: strip sensitive attributes from features; periodic reviews.
- **Spam/Abuse**: light employer KYC; API throttling; content moderation.
- **Performance**: write‑back cache for usage (Redis), queue AI calls; LLM circuit breakers.
- **Legal**: terms covering AI usage; export/delete personal data (GDPR‑like).

---

## 10) Technical Checklist

- Feature flags (GrowthBook/Unleash).
- Entitlement middleware + Redis usage counters.
- Background workers (BullMQ‑style) for AI & emails.
- Dedicated **billing** bounded context.
- Observability: traces (OTel), app metrics (p95), business metrics (MRR, conversion).

---

## 11) Suggested APIs (compact)

```
POST /ai/cv-score { cv_id, job_id? }
POST /ai/cv-improve { cv_id, job_id? }
GET  /jobs/recommendations
GET  /candidates/recommendations?job_id=
POST /employer/jd/generate { title, skills[], level, ... }
POST /interviews/schedule { applicant_id, job_id, slots[] }
POST /reports { subject_type, subject_id, reason }
POST /billing/checkout { product, price, period, quantity }
```

---

## 12) Data Model (Postgres + JSONB)

```sql
CREATE TABLE subscription (
  id uuid primary key,
  user_id uuid,
  org_id uuid,
  product text,
  price_id text,
  status text,
  current_period_end timestamptz,
  meta jsonb
);

CREATE TABLE entitlement (
  id uuid primary key,
  subject_type text,
  subject_id uuid,
  feature text,
  limit_month int,
  meta jsonb
);

CREATE TABLE usage_counter (
  id uuid primary key,
  subject_type text,
  subject_id uuid,
  feature text,
  period text,
  used int,
  updated_at timestamptz
);
```

---

## 13) Paywall & Growth UX

- Inline comparison table at the **moment of pain** (when quota is exhausted).
- **7‑day trial** (no payment method required) to boost conversion.
- Yearly plans **~20% off** vs monthly; bundle Employer + Add‑ons.
- NPS prompts after mock interviews / CV improvements.

---

### Conclusion

These premium tiers map directly to core outcomes: **increase candidate success** and **shorten time‑to‑hire**. The entitlement + usage architecture scales, keeps AI costs in check, and enables add‑on revenue streams.

# Connect‑Career — High‑Level System (Mermaid) & Database Low‑Level Design

> Scope: Premium plans (Candidate/Employer), entitlements & usage metering, collaboration with external payment providers (Stripe + MoMo/ZaloPay/VietQR), invoicing/refunds, and data model to support AI quotas and messaging limits.

---
