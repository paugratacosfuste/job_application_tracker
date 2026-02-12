import type { Database } from './database'

// Core database row types
export type ApplicationRow = Database['public']['Tables']['applications']['Row']
export type ApplicationInsert = Database['public']['Tables']['applications']['Insert']
export type ApplicationUpdate = Database['public']['Tables']['applications']['Update']
export type StatusHistoryRow = Database['public']['Tables']['status_history']['Row']
export type TagRow = Database['public']['Tables']['tags']['Row']
export type UserSettings = Database['public']['Tables']['user_settings']['Row']
export type ResumeRow = Database['public']['Tables']['resumes']['Row']
export type ResumeInsert = Database['public']['Tables']['resumes']['Insert']
export type ResumeUpdate = Database['public']['Tables']['resumes']['Update']
export type CoverLetterRow = Database['public']['Tables']['cover_letters']['Row']
export type CoverLetterInsert = Database['public']['Tables']['cover_letters']['Insert']
export type CoverLetterUpdate = Database['public']['Tables']['cover_letters']['Update']

// Extended types used by components (backward-compatible names)
export type Application = ApplicationRow & {
  tag_names?: string
  tags?: Tag[]
  application_tags?: { tag_id: string; tags: Tag }[]
  status_history?: StatusHistoryEntry[]
}

export type Tag = TagRow & {
  usage_count?: number
  application_tags?: { count: number }[]
}

export type StatusHistoryEntry = StatusHistoryRow

export type Resume = ResumeRow
export type CoverLetter = CoverLetterRow

export interface ParseResult {
  parsed: {
    company_name: string | null
    job_title: string | null
    salary_min: number | null
    salary_max: number | null
    salary_currency: string
    compensation_type: string | null
    location_city: string | null
    location_country: string | null
    work_mode: string | null
    requirements: string[]
    description_summary: string | null
    seniority_level: string | null
    company_size: string | null
    company_website?: string | null
  }
  raw_text: string
  source_url?: string
  fields_extracted: number
  total_fields: number
}

export interface Stats {
  total: number
  byStatus: { status: string; count: number }[]
  responseRate: number
  avgSalary: number | null
  activeCount: number
  timeline: { week: string; count: number }[]
  salaryDistribution: { salary_min: number; salary_max: number }[]
  avgDaysPerStage: { stage: string; avg_days: number }[]
  topTags: { name: string; count: number }[]
  sourceStats: { source: string; total: number; interviews: number; offers: number }[]
}
