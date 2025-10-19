export interface JobPosting {
  url: string;
  job_posting_id: string;
  job_title: string;
  company_name: string;
  company_id: string;
  job_location: string;
  job_summary: string;
  job_seniority_level: string;
  job_function: string;
  job_employment_type: string;
  job_industries: string;
  job_base_pay_range: string;
  company_url: string;
  job_posted_time: string;
  job_num_applicants: number;
  discovery_input: DiscoveryInput;
  apply_link: string | null;
  country_code: string | null;
  title_id: string;
  company_logo: string;
  job_posted_date: string;
  job_poster: JobPoster;
  application_availability: string | null;
  job_description_formatted: string;
  base_salary: BaseSalary;
  salary_standards: string;
}

export interface DiscoveryInput {
  experience_level: string | null;
  job_type: string | null;
  remote: string | null;
  selective_search: string | null;
  time_range: string | null;
}

export interface JobPoster {
  name: string | null;
  title: string | null;
  url: string | null;
}

export interface BaseSalary {
  currency: string;
  max_amount: number;
  min_amount: number;
  payment_period: string;
}
