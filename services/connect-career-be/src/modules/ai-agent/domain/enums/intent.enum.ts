/**
 * Intent types for AI agent system
 * Represents different user intents that can be detected and handled by agents
 */
export enum Intent {
  // Job Discovery & Search
  JOB_SEARCH = 'job_search',
  FIND_JOBS = 'find_jobs',
  JOB_DISCOVERY = 'job_discovery',

  // Job Matching
  JOB_MATCH = 'job_match',
  JOB_MATCHING = 'job_matching',
  PROFILE_MATCHING = 'profile_matching',
  CV_MATCHING = 'cv_matching',
  SKILL_MATCHING = 'skill_matching',

  // Information Gathering
  INFORMATION_GATHERING = 'information_gathering',
  DATA_COLLECTION = 'data_collection',
  PROFILE_BUILDING = 'profile_building',
  PREFERENCE_CAPTURE = 'preference_capture',

  // Analysis
  CV_ANALYSIS = 'cv_analysis',
  SKILL_ANALYSIS = 'skill_analysis',
  JOB_ANALYSIS = 'job_analysis',
  GAP_ANALYSIS = 'gap_analysis',
  CAREER_ANALYSIS = 'career_analysis',

  // Comparison
  COMPARE_JOBS = 'compare_jobs',
  COMPARE_COMPANIES = 'compare_companies',
  COMPARE_OFFERS = 'compare_offers',
  COMPARISON = 'comparison',

  // Career Planning
  CAREER_PATH = 'career_path',
  SKILL_GAP = 'skill_gap',
  LEARNING_PATH = 'learning_path',

  // Interview & Application
  INTERVIEW_PREP = 'interview_prep',
  APPLICATION_STATUS = 'application_status',

  // CV/Resume
  CV_REVIEW = 'cv_review',

  // Company Research
  COMPANY_RESEARCH = 'company_research',

  // FAQ & Help
  FAQ = 'faq',
  QUESTION = 'question',
  HELP = 'help',
}

