-- Redesign v2, part 4 feature 1: every mission is a place where the work is done and recorded.
-- Additive only. Apply in Supabase (SQL editor) before deploying code that writes entries; the
-- app detects the columns/table and keeps the old mission page until they exist.

-- What the mission page shows under the headline, and when the mission may be marked done.
alter table public.roadmap_tasks add column if not exists workspace text
  check (workspace is null or workspace in ('list', 'interviews', 'learn', 'summary', 'generic'));
-- Type-specific content: list target and fields; interview script, first message (en/hi),
-- questions and rule; lesson points and quiz; summary prompts.
alter table public.roadmap_tasks add column if not exists workspace_spec jsonb;
-- A rule code can check, e.g. {"metric":"list.count","min":6} or {"metric":"interviews.count","min":4}.
alter table public.roadmap_tasks add column if not exists done_rule jsonb;
-- An easier way to the same goal ("Stuck? — I can't do this part").
alter table public.roadmap_tasks add column if not exists fallback text;

-- What the founder produced inside a mission: list rows, logged interviews, quiz answers,
-- notes and summaries. Saved as they type.
create table if not exists public.mission_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid not null references public.roadmap_tasks (id) on delete cascade,
  kind text not null check (kind in ('list_row', 'interview', 'quiz', 'note', 'summary')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mission_entries_task_kind_idx
  on public.mission_entries (task_id, kind, created_at);
create index if not exists mission_entries_user_idx on public.mission_entries (user_id);

alter table public.mission_entries enable row level security;

drop policy if exists "mission_entries_select_own" on public.mission_entries;
create policy "mission_entries_select_own" on public.mission_entries
  for select using (auth.uid() = user_id);
drop policy if exists "mission_entries_insert_own" on public.mission_entries;
create policy "mission_entries_insert_own" on public.mission_entries
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.roadmap_tasks t where t.id = task_id and t.user_id = auth.uid()
    )
  );
drop policy if exists "mission_entries_update_own" on public.mission_entries;
create policy "mission_entries_update_own" on public.mission_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "mission_entries_delete_own" on public.mission_entries;
create policy "mission_entries_delete_own" on public.mission_entries
  for delete using (auth.uid() = user_id);
