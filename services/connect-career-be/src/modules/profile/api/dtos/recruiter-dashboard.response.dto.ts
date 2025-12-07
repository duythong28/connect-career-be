// src/modules/profile/api/dtos/recruiter-dashboard-response.dto.ts
export interface MyWorkSummary {
  assignedApplications: {
    total: number;
    byStatus: Array<{ status: string; count: number }>;
    urgent: number; // Flagged or high priority
    needsAttention: number; // Awaiting response, overdue reminders
  };
  myInterviews: {
    today: number;
    thisWeek: number;
    upcoming: number;
    completed: number;
  };
  myOffers: {
    pending: number;
    awaitingResponse: number;
    accepted: number;
    rejected: number;
  };
  tasks: {
    total: number;
    overdue: number;
    dueToday: number;
    dueThisWeek: number;
  };
}

export interface CompanyOverview {
  organization: {
    id: string;
    name: string;
    logo?: string;
  };
  jobs: {
    total: number;
    active: number;
    paused: number;
    closed: number;
    totalApplications: number;
    newApplicationsToday: number;
  };
  applications: {
    total: number;
    byStatus: Array<{ status: string; count: number }>;
    newToday: number;
    newThisWeek: number;
  };
  pipeline: {
    totalCandidates: number;
    byStage: Array<{
      stageName: string;
      stageKey: string;
      count: number;
    }>;
  };
  recentActivity: Array<{
    type: string; // 'application', 'interview', 'offer', 'status_change'
    description: string;
    timestamp: Date;
    relatedId: string;
  }>;
}

export interface UpcomingTasks {
  interviews: Array<{
    id: string;
    applicationId: string;
    candidateName: string;
    jobTitle: string;
    scheduledDate: Date;
    type: string;
    status: string;
    meetingLink?: string;
    location?: string;
    isToday: boolean;
    isUpcoming: boolean;
  }>;
  reminders: Array<{
    id: string;
    applicationId: string;
    candidateName: string;
    jobTitle: string;
    type: string;
    dueDate: Date;
    notes?: string;
    isOverdue: boolean;
  }>;
  followUps: Array<{
    applicationId: string;
    candidateName: string;
    jobTitle: string;
    lastContactDate?: Date;
    daysSinceLastContact: number;
    status: string;
    needsFollowUp: boolean;
  }>;
  pendingActions: Array<{
    type: string; // 'review', 'schedule_interview', 'send_offer', 'update_status'
    applicationId: string;
    candidateName: string;
    jobTitle: string;
    priority: number;
    dueDate?: Date;
  }>;
}

export interface QuickActions {
  canCreateJob: boolean;
  canInviteCandidate: boolean;
  canScheduleInterview: boolean;
  canSendOffer: boolean;
  quickStats: {
    applicationsToReview: number;
    interviewsToSchedule: number;
    offersToSend: number;
    candidatesToContact: number;
  };
}

export interface RecruiterPerformance {
  period: {
    startDate: string;
    endDate: string;
  };
  metrics: {
    applicationsReviewed: number;
    interviewsConducted: number;
    offersSent: number;
    hires: number;
    averageTimeToReview: number; // hours
    averageTimeToSchedule: number; // hours
    responseRate: number; // percentage
    offerAcceptanceRate: number; // percentage
  };
  comparison: {
    previousPeriod: Partial<RecruiterPerformance['metrics']>;
    changes: {
      applicationsReviewed: { change: number; percentage: number };
      hires: { change: number; percentage: number };
    };
  } | null;
}

export interface RecruiterDashboardResponse {
  myWork: MyWorkSummary;
  companyOverview: CompanyOverview;
  upcomingTasks: UpcomingTasks;
  quickActions: QuickActions;
  performance: RecruiterPerformance;
  notifications: {
    unreadCount: number;
    recent: Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      timestamp: Date;
      isRead: boolean;
      actionUrl?: string;
    }>;
  };
}
