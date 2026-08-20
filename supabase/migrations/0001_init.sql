-- Solventia core schema
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query > paste > Run).
-- Safe to re-run: every statement is idempotent (IF NOT EXISTS / OR REPLACE).

-- ============================================================
-- profiles — one row per authenticated user
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- business_dna — the synthesized founder profile (one active per user)
-- ============================================================
create table if not exists public.business_dna (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  onboarding_answers jsonb not null,
  normalized_signals jsonb not null,
  founder_analysis jsonb,
  ai_model text,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_dna_user_id_idx on public.business_dna (user_id, created_at desc);

alter table public.business_dna enable row level security;

drop policy if exists "business_dna_all_own" on public.business_dna;
create policy "business_dna_all_own" on public.business_dna
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- opportunities — generated candidates for a user
-- ============================================================
create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  business_dna_id uuid not null references public.business_dna (id) on delete cascade,
  title text not null,
  one_liner text not null,
  who_for text,
  fit_score int not null check (fit_score between 0 and 100),
  score_breakdown jsonb not null,
  candidate jsonb not null, -- full structured opportunity payload from Gemini (validated)
  status text not null default 'active' check (status in ('active', 'saved', 'dismissed', 'selected')),
  dismiss_reason text,
  batch_number int not null default 1,
  ai_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists opportunities_user_id_idx on public.opportunities (user_id, created_at desc);
create unique index if not exists opportunities_one_selected_per_user
  on public.opportunities (user_id) where (status = 'selected');

alter table public.opportunities enable row level security;

drop policy if exists "opportunities_all_own" on public.opportunities;
create policy "opportunities_all_own" on public.opportunities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- opportunity_details — lazily generated deep-dive content per opportunity
-- ============================================================
create table if not exists public.opportunity_details (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  detail jsonb not null, -- validated OpportunityDetail structured payload
  ai_model text,
  created_at timestamptz not null default now()
);

create unique index if not exists opportunity_details_opportunity_id_idx
  on public.opportunity_details (opportunity_id);

alter table public.opportunity_details enable row level security;

drop policy if exists "opportunity_details_all_own" on public.opportunity_details;
create policy "opportunity_details_all_own" on public.opportunity_details
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- opportunity_evidence — market signals with real sources (never fabricated)
-- ============================================================
create table if not exists public.opportunity_evidence (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  claim text not null,
  label text not null check (label in (
    'strong_signal', 'early_signal', 'emerging', 'competitive', 'needs_validation', 'limited_evidence'
  )),
  source_title text,
  source_url text,
  retrieved_at timestamptz not null default now()
);

create index if not exists opportunity_evidence_opportunity_id_idx
  on public.opportunity_evidence (opportunity_id);

alter table public.opportunity_evidence enable row level security;

drop policy if exists "opportunity_evidence_all_own" on public.opportunity_evidence;
create policy "opportunity_evidence_all_own" on public.opportunity_evidence
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- idea_feedback — Interested / Maybe later / Not for me / Save
-- ============================================================
create table if not exists public.idea_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  feedback text not null check (feedback in ('interested', 'maybe_later', 'not_for_me', 'saved')),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idea_feedback_opportunity_id_idx on public.idea_feedback (opportunity_id);

alter table public.idea_feedback enable row level security;

drop policy if exists "idea_feedback_all_own" on public.idea_feedback;
create policy "idea_feedback_all_own" on public.idea_feedback
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- roadmaps / roadmap_phases / roadmap_tasks
-- ============================================================
create table if not exists public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'archived')),
  ai_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists roadmaps_user_id_idx on public.roadmaps (user_id, created_at desc);

alter table public.roadmaps enable row level security;

drop policy if exists "roadmaps_all_own" on public.roadmaps;
create policy "roadmaps_all_own" on public.roadmaps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.roadmap_phases (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmaps (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  order_index int not null,
  key text not null,
  title text not null,
  description text
);

create index if not exists roadmap_phases_roadmap_id_idx on public.roadmap_phases (roadmap_id, order_index);

alter table public.roadmap_phases enable row level security;

drop policy if exists "roadmap_phases_all_own" on public.roadmap_phases;
create policy "roadmap_phases_all_own" on public.roadmap_phases
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.roadmap_tasks (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references public.roadmap_phases (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  order_index int not null,
  what text not null,
  why text not null,
  how text not null,
  resource text,
  time_estimate text,
  deadline date,
  done_when text not null,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'done', 'blocked')),
  blocked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists roadmap_tasks_phase_id_idx on public.roadmap_tasks (phase_id, order_index);

alter table public.roadmap_tasks enable row level security;

drop policy if exists "roadmap_tasks_all_own" on public.roadmap_tasks;
create policy "roadmap_tasks_all_own" on public.roadmap_tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- mentor_conversations / mentor_messages
-- ============================================================
create table if not exists public.mentor_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  opportunity_id uuid references public.opportunities (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.mentor_conversations enable row level security;

drop policy if exists "mentor_conversations_all_own" on public.mentor_conversations;
create policy "mentor_conversations_all_own" on public.mentor_conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.mentor_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.mentor_conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists mentor_messages_conversation_id_idx
  on public.mentor_messages (conversation_id, created_at);

alter table public.mentor_messages enable row level security;

drop policy if exists "mentor_messages_all_own" on public.mentor_messages;
create policy "mentor_messages_all_own" on public.mentor_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- research_cache — shared cache, keyed by a deterministic query hash (not user-scoped)
-- ============================================================
create table if not exists public.research_cache (
  cache_key text primary key,
  query text not null,
  result jsonb not null,
  sources jsonb not null default '[]'::jsonb,
  retrieved_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.research_cache enable row level security;

-- Research cache holds no personal data (only opportunity-category queries), so
-- any authenticated user may read/write it — it's a shared cost-saving layer.
drop policy if exists "research_cache_read_authenticated" on public.research_cache;
create policy "research_cache_read_authenticated" on public.research_cache
  for select using (auth.role() = 'authenticated');

drop policy if exists "research_cache_write_authenticated" on public.research_cache;
create policy "research_cache_write_authenticated" on public.research_cache
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "research_cache_update_authenticated" on public.research_cache;
create policy "research_cache_update_authenticated" on public.research_cache
  for update using (auth.role() = 'authenticated');
