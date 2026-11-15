-- Redesign v2, part 4 features 3 and 8. Additive only.

-- Every "Stuck?" answer, with its mission: the drop-off data.
create table if not exists public.mission_stuck_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid not null references public.roadmap_tasks (id) on delete cascade,
  reason text not null check (reason in ('cant', 'time', 'wrong')),
  created_at timestamptz not null default now()
);
create index if not exists mission_stuck_events_task_idx on public.mission_stuck_events (task_id);
alter table public.mission_stuck_events enable row level security;
drop policy if exists "mission_stuck_events_select_own" on public.mission_stuck_events;
create policy "mission_stuck_events_select_own" on public.mission_stuck_events
  for select using (auth.uid() = user_id);
drop policy if exists "mission_stuck_events_insert_own" on public.mission_stuck_events;
create policy "mission_stuck_events_insert_own" on public.mission_stuck_events
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.roadmap_tasks t where t.id = task_id and t.user_id = auth.uid())
  );

-- "No time this week" moves the week by seven days, with no penalty.
alter table public.roadmap_weeks add column if not exists shifted_days int not null default 0;

-- One weekly reminder (feature 8): off by default, asked once after the roadmap is built.
alter table public.profiles add column if not exists weekly_reminder boolean not null default false;
alter table public.profiles add column if not exists reminder_weekday smallint
  check (reminder_weekday is null or reminder_weekday between 0 and 6);
alter table public.profiles add column if not exists reminder_asked_at timestamptz;
alter table public.profiles add column if not exists reminder_last_sent_at timestamptz;
