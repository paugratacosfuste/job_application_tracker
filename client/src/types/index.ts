export interface Application {
  id: number;
  company_name: string;
  company_website: string | null;
  company_size: 'startup' | 'mid' | 'enterprise' | null;
  job_title: string;
  job_url: string | null;
  job_description_raw: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  compensation_type: 'annual' | 'hourly' | 'contract' | null;
  location_city: string | null;
  location_country: string | null;
  work_mode: 'remote' | 'hybrid' | 'on-site' | null;
  status: string;
  date_applied: string | null;
  date_added: string;
  match_score: number | null;
  source: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_role: string | null;
  notes: string | null;
  priority: 'high' | 'medium' | 'low';
  follow_up_date: string | null;
  resume_version: string | null;
  cover_letter_notes: string | null;
  tag_names?: string;
  tags?: Tag[];
  status_history?: StatusHistoryEntry[];
}

export interface Tag {
  id: number;
  name: string;
  usage_count?: number;
}

export interface StatusHistoryEntry {
  id: number;
  application_id: number;
  from_status: string | null;
  to_status: string;
  changed_at: string;
  notes: string | null;
}

export interface ParseResult {
  parsed: {
    company_name: string | null;
    job_title: string | null;
    salary_min: number | null;
    salary_max: number | null;
    salary_currency: string;
    compensation_type: string | null;
    location_city: string | null;
    location_country: string | null;
    work_mode: string | null;
    requirements: string[];
    description_summary: string | null;
    seniority_level: string | null;
    company_size: string | null;
  };
  raw_text: string;
  source_url?: string;
  fields_extracted: number;
  total_fields: number;
}

export interface Stats {
  total: number;
  byStatus: { status: string; count: number }[];
  responseRate: number;
  avgSalary: number | null;
  activeCount: number;
  timeline: { week: string; count: number }[];
  salaryDistribution: { salary_min: number; salary_max: number }[];
  avgDaysPerStage: { stage: string; avg_days: number }[];
  topTags: { name: string; count: number }[];
  sourceStats: { source: string; total: number; interviews: number; offers: number }[];
}
