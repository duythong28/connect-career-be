export type UserRole = "candidate" | "employer" | "admin";

export interface User {
id: string;
name: string;
email: string;
role: "candidate" | "employer" | "admin";
avatar?: string;
phone?: string;
companyId?: string;
// Optional fields used across the UI
company?: string;
title?: string;
location?: string;
skills?: string[];
bio?: string;
linkedinUrl?: string;
savedJobs?: string[];
status?: "active" | "banned" | "inactive";
joinedDate?: string;
privacy: {
phone: boolean;
email: boolean;
};
subscription: {
plan: "Free" | "Standard" | "Premium";
expiresAt?: string;
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
uploadedAt: string;
contentMarkdown: string;
isDefault: boolean;
fileName: string;
type: "pdf" | "docx" | "md";
}

export interface Offer {
id: string;
applicationId: string;
amount: number;
currency: string;
status: "pending" | "accepted" | "rejected";
createdAt: string;
details: string;
}

export interface Report {
id: string;
reporterId: string;
targetType: "job" | "user";
targetId: string;
reason: string;
status: "pending" | "resolved" | "dismissed";
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
companyId: string;
// Optional: some UI references use company name directly
company?: string;
location: string;
salary: string;
type: "full-time" | "part-time" | "contract" | "remote" | "internship";
description: string; // Markdown formatted
postedDate: string;
applications: number;
status: "active" | "closed" | "draft";
views: number;
employerId: string;
keywords: string[];
}

export interface Candidate {
id: string;
userId: string;
headline: string;
skills: string[];
experience: Experience[];
education: Education[];
cvs: CV[];
savedJobs: string[];
followedCompanies: string[];
settings: {
profileVisibility: boolean;
jobAlerts: boolean;
};
}

export interface Application {
id: string;
jobId: string;
candidateId: string;
status:
| "New"
| "Screening"
| "Interview"
| "Offer"
| "Hired"
| "Rejected"
| "Withdrawn";
appliedDate: string;
cvId: string;
coverLetter?: string;
notes?: string;
matchingScore: number;
feedback?: {
rating: number;
comment: string;
};
}

export interface Company {
id: string;
name: string;
slug: string;
industry: string;
size: string;
headquarters: string;
website: string;
description: string;
logo: string;
founded: string;
employees: number;
followers: number;
jobs: number;
members: CompanyMember[];
socialLinks: {
linkedin?: string;
twitter?: string;
facebook?: string;
};
// Optional for places where location is referenced
location?: string;
}

export interface Interview {
id: string;
applicationId: string;
// Optional fields referenced in UI components
jobId?: string;
candidateId?: string;
date: string;
time: string;
type: "phone" | "video" | "in-person";
status: "scheduled" | "completed" | "cancelled";
notes?: string;
}

export interface CompanyMember {
id: string;
userId: string;
role: "Company Admin" | "HR" | "Recruiter" | "Viewer";
joinedAt: string;
}

export interface ViolationReport {
id: string;
reporterId: string;
targetType: "job" | "user" | "company";
targetId: string;
reason: string;
status: "pending" | "resolved" | "dismissed";
createdAt: string;
}

export interface Subscription {
id: string;
userId: string;
plan: "Free" | "Standard" | "Premium";
status: "active" | "cancelled" | "expired";
billingHistory: BillingRecord[];
}

export interface BillingRecord {
id: string;
date: string;
plan: string;
amount: number;
status: "paid" | "pending" | "failed";
}

export interface RefundRequest {
id: string;
userId: string;
plan: string;
reason: string;
amount: number;
status: "pending" | "approved" | "denied";
requestedAt: string;
}
