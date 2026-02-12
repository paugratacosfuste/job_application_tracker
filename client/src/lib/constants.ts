export const STATUSES = [
  'saved', 'applied', 'phone_screen', 'technical_interview',
  'final_round', 'offer', 'accepted', 'rejected', 'withdrawn'
] as const;

export type Status = typeof STATUSES[number];

export const STATUS_LABELS: Record<Status, string> = {
  saved: 'Saved',
  applied: 'Applied',
  phone_screen: 'Phone Screen',
  technical_interview: 'Technical Interview',
  final_round: 'Final Round',
  offer: 'Offer',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

// Colors using the palette: Navy #102542, Blue #489FB5, Orange #FFA62B, Red #E53D00, Green #7CB518/#A1C181
export const STATUS_COLORS: Record<Status, string> = {
  saved: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  applied: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300',
  phone_screen: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-300',
  technical_interview: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300',
  final_round: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
  offer: 'bg-lime-100 text-lime-800 dark:bg-lime-900/60 dark:text-lime-300',
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300',
  withdrawn: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

export const PRIORITY_COLORS: Record<string, string> = {
  high: 'border-l-[#E53D00]',
  medium: 'border-l-[#FFA62B]',
  low: 'border-l-[#7CB518]',
};

export const KANBAN_STATUSES: Status[] = [
  'saved', 'applied', 'phone_screen', 'technical_interview',
  'final_round', 'offer', 'accepted', 'rejected', 'withdrawn'
];

// Statuses that require a date/time prompt when transitioning TO them
export const STATUS_NEEDS_DATE: Record<string, { label: string; type: 'datetime-local' | 'date' }> = {
  phone_screen: { label: 'Phone Screen Date & Time', type: 'datetime-local' },
  technical_interview: { label: 'Technical Interview Date & Time', type: 'datetime-local' },
  final_round: { label: 'Final Round Date & Time', type: 'datetime-local' },
  offer: { label: 'Offer Date', type: 'date' },
  applied: { label: 'Application Date', type: 'date' },
  accepted: { label: 'Deadline to Accept/Decline', type: 'date' },
};

// Statuses that don't need any prompt
export const STATUS_NO_PROMPT = ['rejected', 'withdrawn'];

export const WORK_MODES = ['remote', 'hybrid', 'on-site'] as const;
export const COMPANY_SIZES = ['startup', 'mid', 'enterprise'] as const;
export const COMPENSATION_TYPES = ['annual', 'hourly', 'contract'] as const;
export const SOURCES = ['linkedin', 'indeed', 'company_site', 'referral', 'job_board', 'other'] as const;
export const PRIORITIES = ['high', 'medium', 'low'] as const;

export const SOURCE_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  indeed: 'Indeed',
  company_site: 'Company Site',
  referral: 'Referral',
  job_board: 'Job Board',
  other: 'Other',
};

// Chart colors matching the palette
export const CHART_COLORS = {
  navy: '#102542',
  blue: '#489FB5',
  orange: '#FFA62B',
  red: '#E53D00',
  green: '#7CB518',
  greenLight: '#A1C181',
  cyan: '#06B6D4',
  indigo: '#6366F1',
  slate: '#64748B',
};
