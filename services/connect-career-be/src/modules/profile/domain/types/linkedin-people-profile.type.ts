export interface LinkedInCurrentCompany {
  company_id: string;
  link: string;
  location: string | null;
  name: string;
  title?: string;
}

export interface LinkedInExperience {
  company: string;
  company_logo_url: string;
  description_html: string | null;
  subtitle: string;
  title: string;
}

export interface LinkedInEducation {
  description: string | null;
  description_html: string | null;
  end_year: string;
  institute_logo_url: string | null;
  title?: string;
}

export interface LinkedInLanguage {
  subtitle: string;
  title: string;
}

export interface LinkedInCertification {
  credential_id: string;
  credential_url: string;
  meta: string;
  subtitle: string;
  title: string;
}

export interface LinkedInVolunteerExperience {
  cause: string;
  duration: string;
  duration_short: string;
  end_date: string;
  info: string;
  start_date: string;
  subtitle: string;
  title: string;
}

export interface LinkedInActivity {
  id: string;
  img: string;
  interaction: string;
  link: string;
  title: string;
}

export interface LinkedInSimilarProfile {
  link?: string;
  location?: string;
  name?: string;
  summary?: string;
}

export interface LinkedInPeopleProfile {
  id: string;
  name: string;
  city: string;
  country_code: string;
  position: string | null;
  about: string | null;
  posts: any | null;
  current_company: LinkedInCurrentCompany | null;
  experience: LinkedInExperience[];
  url: string;
  people_also_viewed: any | null;
  educations_details: string;
  education: LinkedInEducation[];
  recommendations_count: number | null;
  avatar: string;
  courses: any | null;
  languages: LinkedInLanguage[];
  certifications: LinkedInCertification[];
  recommendations: any | null;
  volunteer_experience: LinkedInVolunteerExperience[];
  followers: number;
  connections: number;
  current_company_company_id: string;
  current_company_name: string;
  publications: any | null;
  patents: any | null;
  projects: any | null;
  organizations: any | null;
  location: string;
  input_url: string;
  linkedin_id: string;
  activity: LinkedInActivity[];
  linkedin_num_id: string;
  banner_image: string;
  honors_and_awards: any | null;
  similar_profiles: LinkedInSimilarProfile[];
  default_avatar: boolean;
  memorialized_account: boolean;
  bio_links: any[];
  first_name: string;
  last_name: string;
}

// Type for the entire JSON file (array of profiles)
export type LinkedInPeopleProfiles = LinkedInPeopleProfile[];
