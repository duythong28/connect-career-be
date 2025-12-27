/**
 * Agent Prompts
 * Prompts used by various agents (FAQ, Job Discovery, Matching, Analysis, etc.)
 */

export const FaqAgentPrompts = {
  system: `You are a helpful assistant providing clear, concise answers.`,

  user: (
    question: string,
    faqContext: string,
  ) => `Answer the user's question based on this FAQ:

${faqContext}

User question: ${question}

Provide a clear, helpful answer.`,
};

export const JobDiscoveryAgentPrompts = {
  system: `You are a career advisor helping users find the best job matches.`,

  user: (
    userProfile: string,
    jobListings: string,
  ) => `Based on the following job listings, provide personalized recommendations:

User Profile:
${userProfile}

Job Listings:
${jobListings}

Provide recommendations with explanations for why each job is a good match.`,
};

export const MatchingAgentPrompts = {
  system: `You are a career matching expert providing detailed match analysis.`,

  user: (
    userProfile: string,
    jobMatches: string,
    analysisType: 'job_match' | 'cv_match' | 'skill_match',
  ) => {
    const analysisInstructions =
      analysisType === 'job_match'
        ? 'Analyze how well the user profile matches each job and provide match scores with explanations.'
        : analysisType === 'cv_match'
          ? 'Analyze how well the CV matches the job requirements and identify strengths and gaps.'
          : 'Analyze skill matches and gaps between the user and job requirements.';

    return `Analyze the job matches and provide:
1. Match scores (0-100) for each job
2. Key matching factors
3. Areas of strength
4. Potential gaps or concerns
5. Recommendations

User Profile:
${userProfile}

Job Matches:
${jobMatches}

${analysisInstructions}`;
  },
};

export const AnalysisAgentPrompts = {
  cvAnalysis: {
    system: `You are a professional CV reviewer and career advisor.`,
    user: (cvContent: string) => `Analyze the following CV and provide:
1. Overall assessment
2. Strengths and weaknesses
3. Suggestions for improvement
4. Career recommendations

CV Content:
${cvContent}`,
  },

  skillAnalysis: {
    system: `You are a skills and career market analyst.`,
    user: (
      skills: string,
      jobMarket?: string,
    ) => `Analyze the following skills and provide:
1. Market value assessment
2. Demand trends
3. Career opportunities
4. Skill development recommendations

Skills:
${skills}
${jobMarket ? `\nJob Market Context:\n${jobMarket}` : ''}`,
  },

  jobAnalysis: {
    system: `You are a job market analyst and career advisor.`,
    user: (
      jobPosting: string,
      userContext?: string,
    ) => `Analyze the following job posting and provide:
1. Job requirements breakdown
2. Required vs preferred qualifications
3. Market competitiveness
4. Application recommendations

Job Posting:
${jobPosting}
${userContext ? `\nUser Context:\n${userContext}` : ''}`,
  },

  gapAnalysis: {
    system: `You are a career development and learning path advisor.`,
    user: (
      userSkills: string,
      targetSkills: string,
      jobContext?: string,
    ) => `Perform a skill gap analysis:

Current Skills:
${userSkills}

Target Skills:
${targetSkills}
${jobContext ? `\nJob Context:\n${jobContext}` : ''}

Provide:
1. Identified gaps
2. Priority learning areas
3. Recommended learning paths
4. Timeline estimates`,
  },

  comprehensiveAnalysis: {
    system: `You are a comprehensive career advisor.`,
    user: (
      userProfile: string,
      jobData?: string,
      marketData?: string,
    ) => `Provide a comprehensive career analysis based on:

User Profile:
${userProfile}
${jobData ? `\nJob Data:\n${jobData}` : ''}
${marketData ? `\nMarket Data:\n${marketData}` : ''}

Include:
1. Career trajectory assessment
2. Market positioning
3. Growth opportunities
4. Strategic recommendations`,
  },
};

export const ComparisonAgentPrompts = {
  system: `You are an expert at comparing and analyzing different options. Provide clear, structured comparisons.`,

  user: (
    items: string,
    comparisonType: 'jobs' | 'companies' | 'offers',
  ) => `Compare the following items and provide a structured comparison:

Items to Compare:
${items}

Comparison Type: ${comparisonType}

Provide:
1. Side-by-side comparison
2. Pros and cons for each
3. Best fit recommendation
4. Key differentiators`,
};

export const InformationGatheringAgentPrompts = {
  questionGeneration: {
    system: `You are a friendly assistant gathering user information through conversation.`,
    user: (
      missingInfo: string,
    ) => `Generate natural, conversational questions to gather the following information:

Missing Information:
${missingInfo}

Generate 2-3 friendly, non-intrusive questions that feel natural in conversation.`,
  },

  informationExtraction: {
    system: `You are an information extraction system. Return only valid JSON.`,
    user: (
      conversation: string,
      targetFields: string,
    ) => `Extract structured information from this conversation:

Conversation:
${conversation}

Target Fields:
${targetFields}

Extract and return ONLY a JSON object with any new information found. Include fields like:
- name, email, phone
- skills, experience, education
- preferences, location, salary expectations
- job interests, career goals

Return only valid JSON, no explanation.`,
  },

  informationSummary: {
    system: `You are a helpful assistant summarizing user information.`,
    user: (
      userInfo: string,
    ) => `Summarize the following user information in a friendly, structured way:

User Information:
${userInfo}

Provide a clear, organized summary that can be used for job matching and recommendations.`,
  },
};

export const OrchestratorAgentPrompts = {
  system: `You are a task decomposition expert. Break down complex tasks into atomic, executable subtasks.`,

  user: (
    task: string,
    availableAgents: string,
  ) => `Decompose the following task into smaller, actionable subtasks that can be handled by specialized agents.

Task: ${task}

Available Agents:
${availableAgents}

Return a JSON array of tasks with this structure:
[
  {
    "subtask": "description",
    "agent": "agent_name",
    "priority": "high|medium|low",
    "dependencies": ["other_subtask_ids"]
  }
]`,
};

export const ChainsServicePrompts = {
  agentChain: (
    agentName: string,
    agentDescription: string,
    capabilities: string[],
  ) => `You are ${agentName}: ${agentDescription}

Your capabilities: ${capabilities.join(', ')}

You have access to the following tools. Use them when needed to complete tasks.
Always explain what you're doing and why.`,

  defaultSystem: `You are a helpful assistant. Use the following context to answer questions.
Be accurate, helpful, and concise.`,
};
