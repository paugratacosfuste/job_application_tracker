-- ============================================================
-- Migration 002: Resume Management System
-- ============================================================

-- ============================================================
-- Table: resumes
-- ============================================================
create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,                    -- e.g. "Frontend Developer CV"
  file_name text not null,                -- original upload name
  storage_path text not null,             -- path in Supabase storage
  file_size integer,                      -- bytes
  mime_type text default 'application/pdf',
  version integer default 1,
  parent_id uuid references public.resumes(id) on delete set null,  -- lineage
  is_default boolean default false,
  times_used integer default 0,
  tags text[] default '{}',               -- e.g. {'frontend','react'}
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-update trigger
create trigger resumes_updated_at
  before update on public.resumes
  for each row execute function update_updated_at();

-- RLS
alter table public.resumes enable row level security;
create policy "Users CRUD own resumes" on public.resumes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Table: cover_letters
-- ============================================================
create table public.cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  resume_id uuid references public.resumes(id) on delete set null,
  label text not null,
  content text,                           -- full text or notes
  storage_path text,                      -- optional PDF upload
  file_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-update trigger
create trigger cover_letters_updated_at
  before update on public.cover_letters
  for each row execute function update_updated_at();

-- RLS
alter table public.cover_letters enable row level security;
create policy "Users CRUD own cover letters" on public.cover_letters
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Add FK constraints on applications.resume_id / cover_letter_id
-- (columns already exist from 001 migration as nullable UUID)
-- ============================================================
alter table public.applications
  add constraint applications_resume_id_fkey
  foreign key (resume_id) references public.resumes(id) on delete set null;

alter table public.applications
  add constraint applications_cover_letter_id_fkey
  foreign key (cover_letter_id) references public.cover_letters(id) on delete set null;

-- ============================================================
-- Helper RPC: set_default_resume
-- Clears previous default and sets the given resume as default
-- ============================================================
create or replace function public.set_default_resume(p_resume_id uuid)
returns void as $$
begin
  -- Clear existing default for this user
  update public.resumes
    set is_default = false
    where user_id = auth.uid() and is_default = true;

  -- Set new default
  update public.resumes
    set is_default = true
    where id = p_resume_id and user_id = auth.uid();
end;
$$ language plpgsql security definer;

-- ============================================================
-- Helper RPC: record_resume_usage
-- Increments times_used counter
-- ============================================================
create or replace function public.record_resume_usage(p_resume_id uuid)
returns void as $$
begin
  update public.resumes
    set times_used = times_used + 1
    where id = p_resume_id and user_id = auth.uid();
end;
$$ language plpgsql security definer;
