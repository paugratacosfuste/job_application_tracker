-- Enable UUID extension (in extensions schema for Supabase)
create extension if not exists "uuid-ossp" with schema extensions;

-- ============================================================
-- Table: applications
-- ============================================================
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  company_website text,
  company_size text check (company_size in ('startup', 'mid', 'enterprise')),
  job_title text not null,
  job_url text,
  job_description_raw text,
  salary_min integer,
  salary_max integer,
  salary_not_specified boolean default false,
  salary_currency text default 'EUR',
  compensation_type text check (compensation_type in ('annual', 'hourly', 'contract')),
  location_city text,
  location_country text,
  work_mode text check (work_mode in ('remote', 'hybrid', 'on-site')),
  status text default 'saved' check (status in ('saved', 'applied', 'phone_screen', 'technical_interview', 'final_round', 'offer', 'accepted', 'rejected', 'withdrawn')),
  date_applied timestamptz,
  date_added timestamptz default now(),
  match_score integer check (match_score >= 1 and match_score <= 5),
  source text check (source in ('linkedin', 'indeed', 'company_site', 'referral', 'job_board', 'other')),
  contact_name text,
  contact_email text,
  contact_role text,
  notes text,
  priority text default 'medium' check (priority in ('high', 'medium', 'low')),
  follow_up_date timestamptz,
  resume_version text,
  cover_letter_notes text,
  resume_id uuid,
  cover_letter_id uuid,
  updated_at timestamptz default now()
);

-- Auto-update trigger for updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger applications_updated_at
  before update on public.applications
  for each row execute function update_updated_at();

-- ============================================================
-- Table: status_history
-- ============================================================
create table public.status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_at timestamptz default now(),
  notes text
);

-- ============================================================
-- Table: tags
-- ============================================================
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  unique(user_id, name)
);

-- ============================================================
-- Table: application_tags
-- ============================================================
create table public.application_tags (
  application_id uuid references public.applications(id) on delete cascade,
  tag_id uuid references public.tags(id) on delete cascade,
  primary key (application_id, tag_id)
);

-- ============================================================
-- Table: user_settings
-- ============================================================
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_currency text default 'EUR',
  default_source text default 'linkedin',
  default_work_mode text,
  anthropic_api_key text,
  theme text default 'system' check (theme in ('light', 'dark', 'system')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create user settings on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Row Level Security
-- ============================================================

-- Applications
alter table public.applications enable row level security;
create policy "Users CRUD own applications" on public.applications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Status History
alter table public.status_history enable row level security;
create policy "Users CRUD own status history" on public.status_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Tags
alter table public.tags enable row level security;
create policy "Users CRUD own tags" on public.tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Application Tags (check via subquery on application ownership)
alter table public.application_tags enable row level security;
create policy "Users CRUD own application tags" on public.application_tags
  for all using (
    exists (select 1 from public.applications where id = application_tags.application_id and user_id = auth.uid())
  ) with check (
    exists (select 1 from public.applications where id = application_tags.application_id and user_id = auth.uid())
  );

-- User Settings
alter table public.user_settings enable row level security;
create policy "Users CRUD own settings" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Storage Buckets
-- ============================================================
insert into storage.buckets (id, name, public) values ('resumes', 'resumes', false);
insert into storage.buckets (id, name, public) values ('master-cvs', 'master-cvs', false);

-- Resumes: users access only their own folder
create policy "Users upload own resumes" on storage.objects for insert
  with check (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users read own resumes" on storage.objects for select
  using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users delete own resumes" on storage.objects for delete
  using (bucket_id = 'resumes' and auth.uid()::text = (storage.foldername(name))[1]);

-- Master CVs: same pattern
create policy "Users upload own master CVs" on storage.objects for insert
  with check (bucket_id = 'master-cvs' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users read own master CVs" on storage.objects for select
  using (bucket_id = 'master-cvs' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users delete own master CVs" on storage.objects for delete
  using (bucket_id = 'master-cvs' and auth.uid()::text = (storage.foldername(name))[1]);
