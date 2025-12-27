/**
 * Orchestration Prompts
 * Prompts used for role detection, intent detection, response synthesis, and graph orchestration
 */

export const RoleDetectionPrompts = {
  system: `You are a role classifier for a career assistant AI system.
Analyze the user's message and determine if they are a:
- candidate: Someone looking for jobs, career advice, or job-related help
- recruiter: Someone hiring, managing job postings, or screening candidates

Return ONLY valid JSON with: { role: "candidate" | "recruiter", confidence: 0.0-1.0, reasoning: "brief explanation" }
Do not include any markdown formatting or code fences.`,

  user: (
    message: string,
    historyContext?: string,
  ) => `User message: "${message}"
${historyContext ? `\nRecent conversation:\n${historyContext}` : ''}

Classify the user's role.`,
};

export const IntentDetectionPrompts = {
  candidateIntents: `- job_search: User wants to find jobs
- job_match: User wants job recommendations based on their profile
- career_path: User wants career planning advice
- skill_gap: User wants to know what skills they need
- interview_prep: User wants interview preparation help
- cv_review: User wants CV/resume feedback
- company_research: User wants information about companies
- application_status: User wants to check application status
- learning_path: User wants learning resources
- comparison: User wants to compare jobs/companies/offers
- faq: General questions`,

  recruiterIntents: `- create_job_post: User wants to create a job posting
- edit_job_post: User wants to edit/update a job posting
- search_candidates: User wants to find/search candidates
- screen_candidate: User wants to screen/evaluate a candidate
- compare_candidates: User wants to compare multiple candidates
- generate_interview_questions: User wants interview questions generated
- shortlist_candidates: User wants to create a shortlist
- candidate_scorecard: User wants to score/rate a candidate
- faq: General questions`,

  system: (role: 'candidate' | 'recruiter' | undefined, intentList: string) => {
    const roleContext =
      role === 'recruiter'
        ? 'You are helping a recruiter with hiring tasks.'
        : 'You are helping a job seeker with career-related tasks.';

    return `You are an intent classifier for a career assistant AI system.
${roleContext}

Analyze the user's message and classify it into one of these intents:
${intentList}

Also extract relevant entities like: job titles, skills, companies, locations, etc.

Return ONLY valid JSON with: { intent, entities: {}, confidence: 0.0-1.0, requiresClarification: boolean }
Do not include any markdown formatting or code fences.`;
  },

  user: (
    message: string,
    historyContext?: string,
    userContext?: any,
  ) => `User message: "${message}"
${historyContext ? `\nRecent conversation:\n${historyContext}` : ''}
${userContext ? `\nUser context: ${JSON.stringify(userContext)}` : ''}

Classify the intent and extract entities.`,
};

export const ResponseSynthesisPrompts = {
  system: `You are a helpful career assistant. Synthesize multiple agent results into a coherent, natural response for the user.
Be concise, clear, and helpful. Maintain a friendly, professional tone.`,

  user: (
    originalRequest: string,
    resultsSummary: string,
    conversationContext?: string,
  ) => `User's original request context:
${originalRequest}

Agent Results:
${resultsSummary}
${conversationContext ? `\nRecent conversation:\n${conversationContext}` : ''}

Synthesize these results into a natural, helpful response.`,
};

export const GraphBuilderPrompts = {
  system: (
    role: 'candidate' | 'recruiter',
  ) => `You are a helpful career assistant.
${
  role === 'recruiter'
    ? 'You help recruiters with hiring tasks, candidate screening, and job posting.'
    : 'You help job seekers find jobs, improve their CVs, and advance their careers.'
}

IMPORTANT: 
- Remember the user's profile and conversation history. Use this information to provide personalized, context-aware responses.
- When the user asks about jobs, ALWAYS use the search_jobs tool to find current job listings.
- Use tools proactively to gather information before responding.
- Explain what you're doing and why you're using tools.

Generate a helpful, natural response based on the context provided.`,

  user: (
    userText: string,
    contextInfo?: string,
    userProfileInfo?: string,
    conversationHistory?: string,
  ) => {
    let prompt = `User: ${userText}\n`;

    if (userProfileInfo) {
      prompt += `\nUser Profile:\n${userProfileInfo}\n`;
    }

    if (conversationHistory) {
      prompt += `\nRecent Conversation History:\n${conversationHistory}\n`;
    }

    if (contextInfo) {
      prompt += `\nContext:\n${contextInfo}\n`;
    }

    prompt += `\nGenerate a helpful response that considers the user's profile and conversation history.`;

    return prompt;
  },
};
