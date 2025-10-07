export type CandidateProfileCreatePayload = {
  userId: string;
  title: string | null;
  location: string | null;
  salaryExpectation: number | null;
  skills: string[];
  experiences: Array<{
    company: string;
    title: string;
    startDate: string | null;
    endDate: string | null;
    current: boolean;
    description: string;
  }>;
  education: Array<{
    institution: string;
    degree: string | null;
    field: string | null;
    startDate: string | null;
    endDate: string | null;
    current: boolean;
    description: string | null;
  }>;
  cvs: Array<{
    name: string;
    uploadedAt: string;
    contentMarkdown?: string;
    isDefault?: boolean;
    fileName?: string;
    type?: 'pdf' | 'docx' | 'md';
  }>;
};
