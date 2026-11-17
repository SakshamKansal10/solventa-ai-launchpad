-- Owner, 2026-11-17, Jobs M and N. Additive only.

-- One direction-generation job per founder at a time (the first consultation, "Find 3 more
-- directions", and Ask Sol's "Find new directions"). A second request while one runs gets the
-- same job back — never a second generation; leaving and coming back shows the running job; a
-- failed job is retried in place ("Try again" reuses it).
create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('consultation', 'more', 'refresh')),
  status text not null default 'running' check (status in ('running', 'done', 'failed')),
  -- The real step the server is on: reading → fitting → writing.
  step text not null default 'reading' check (step in ('reading', 'fitting', 'writing')),
  -- What the job produced: the consultation it belongs to and, for "more", the new batch.
  business_dna_id uuid references public.business_dna (id) on delete set null,
  batch_number int,
  added int,
  error text,
  attempts int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);
-- The guarantee: at most one running job per founder (a concurrent second insert fails 23505).
create unique index if not exists generation_jobs_one_running_idx
  on public.generation_jobs (user_id) where status = 'running';
create index if not exists generation_jobs_user_created_idx
  on public.generation_jobs (user_id, created_at desc);
alter table public.generation_jobs enable row level security;
drop policy if exists "generation_jobs_select_own" on public.generation_jobs;
create policy "generation_jobs_select_own" on public.generation_jobs
  for select using (auth.uid() = user_id);
drop policy if exists "generation_jobs_insert_own" on public.generation_jobs;
create policy "generation_jobs_insert_own" on public.generation_jobs
  for insert with check (auth.uid() = user_id);
drop policy if exists "generation_jobs_update_own" on public.generation_jobs;
create policy "generation_jobs_update_own" on public.generation_jobs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- New facts a founder told Ask Sol about themselves ("I now have ₹2 lakh", "I moved to Delhi"),
-- kept as history: never edited or deleted. A row is applied when the founder taps "Find new
-- directions"; the old consultation's answers stay exactly as they were.
create table if not exists public.profile_fact_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- The founder's own words and Sol's one-line understanding of them.
  message text not null,
  summary text not null,
  -- The structured change to the consultation answers (only fields Sol could read for sure).
  patch jsonb not null default '{}'::jsonb,
  -- Facts with no answer field (people, goals, constraints), passed to generation as text.
  notes text[] not null default '{}',
  -- The Ask Sol reply that offered "Find new directions" (the button shows under it).
  conversation_id uuid references public.mentor_conversations (id) on delete set null,
  assistant_message_id uuid references public.mentor_messages (id) on delete set null,
  -- The consultation this update produced, once applied.
  applied_dna_id uuid references public.business_dna (id) on delete set null,
  applied_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists profile_fact_updates_user_idx
  on public.profile_fact_updates (user_id, created_at desc);
alter table public.profile_fact_updates enable row level security;
drop policy if exists "profile_fact_updates_select_own" on public.profile_fact_updates;
create policy "profile_fact_updates_select_own" on public.profile_fact_updates
  for select using (auth.uid() = user_id);
drop policy if exists "profile_fact_updates_insert_own" on public.profile_fact_updates;
create policy "profile_fact_updates_insert_own" on public.profile_fact_updates
  for insert with check (auth.uid() = user_id);
drop policy if exists "profile_fact_updates_update_own" on public.profile_fact_updates;
create policy "profile_fact_updates_update_own" on public.profile_fact_updates
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
