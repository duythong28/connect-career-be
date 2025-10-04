export type UserRole = 'candidate' | 'employer' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  avatarUrl?: string;
  phone?: string;
  companyId?: string;
  company?: string;
  title?: string;
  location?: string;
  bio?: string;
  linkedinUrl?: string;
  skills?: string[];
  status?: 'active' | 'banned' | 'inactive';
  joinedDate?: string;
  savedJobs?: string[];
  subscription?: {
    plan: string;
    expiresAt: string;
  };
  visibility?: {
    phone: boolean;
    email: boolean;
  };
}

export interface CandidateProfile {
  userId: string;
  title: string;
  location: string;
  salaryExpectation?: string;
  skills: string[];
  experiences: Experience[];
  education: Education[];
  cvs: CV[];
}

export interface Experience {
  id: string;
  company: string;
  title: string;
  startDate: string;
  endDate?: string;
  description: string;
  current: boolean;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  current: boolean;
}

export interface CV {
  id: string;
  name: string;
  fileName: string;
  uploadedAt: string;
  type: 'pdf' | 'docx' | 'image';
  visibility: boolean;
  isDefault: boolean;
}

export interface Offer {
  id: string;
  applicationId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  details: string;
}

export interface Report {
  id: string;
  reporterId: string;
  targetType: 'job' | 'user';
  targetId: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: 'full-time' | 'part-time' | 'contract' | 'remote';
  description: string;
  requirements: string[];
  postedDate: string;
  applications: number;
  status: 'active' | 'closed' | 'draft';
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  title: string;
  location: string;
  experience: string;
  skills: string[];
  avatar?: string;
  resume?: string;
  status: 'active' | 'inactive';
}

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  status: 'New' | 'Screening' | 'Interview' | 'Offer' | 'Hired' | 'Rejected' | 'Withdrawn';
  appliedDate: string;
  cvId?: string;
  coverLetter?: string;
  notes?: string;
  matchingScore?: number;
  feedback?: {
    rating: number;
    comment: string;
  };
}

export interface Company {
  id: string;
  name: string;
  industry: string;
  size: string;
  location: string;
  description: string;
  logo?: string;
  jobs: number;
}

export interface Interview {
  id: string;
  applicationId: string;
  jobId: string;
  candidateId: string;
  date: string;
  time: string;
  type: 'phone' | 'video' | 'in-person';
  status: 'scheduled' | 'completed' | 'cancelled';
}
