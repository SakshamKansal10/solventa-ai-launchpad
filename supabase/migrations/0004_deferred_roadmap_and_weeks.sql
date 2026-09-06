-- Solventia deferred-roadmap + week-level unlock migration
-- Run this once in the Supabase SQL Editor. Safe to re-run (idempotent).
-- Additive only — nothing existing is dropped or rewritten. Roadmaps
-- generated before this migration keep working exactly as they render
-- today: roadmap_tasks.week_id stays null for them, and the app falls
-- back to phase-level rendering whenever week_id is null.

-- ============================================================
-- roadmap_weeks — the new tier between roadmap_phases and roadmap_tasks,
-- needed now that roadmap generation happens on-demand for exactly one
-- opportunity at a time and unlocks progressively, one week at a time.
-- ============================================================
create table if not exists public.roadmap_weeks (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references public.roadmap_phases (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  order_index int not null,
  week_number int not null,
  title text not null,
  objective text not null,
  status text not null default 'locked' check (status in ('locked', 'active', 'completed')),
  unlocked_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists roadmap_weeks_phase_id_idx on public.roadmap_weeks (phase_id, order_index);

alter table public.roadmap_weeks enable row level security;

drop policy if exists "roadmap_weeks_all_own" on public.roadmap_weeks;
create policy "roadmap_weeks_all_own" on public.roadmap_weeks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- roadmap_tasks — tie each task to the week that gates it. Nullable: a
-- task generated before this migration has no week and is rendered
-- directly under its phase, same as always.
-- ============================================================
alter table public.roadmap_tasks add column if not exists week_id uuid references public.roadmap_weeks (id) on delete cascade;
create index if not exists roadmap_tasks_week_id_idx on public.roadmap_tasks (week_id, order_index);

-- ============================================================
-- roadmaps — record when a roadmap actually became active (distinct from
-- when it was first created, since a founder can revisit/reactivate an
-- archived roadmap long after it was originally built), and enforce at
-- the DB level what app code has only ever enforced by convention: at
-- most one active roadmap per founder. Mirrors
-- opportunities_one_selected_per_user exactly.
-- ============================================================
alter table public.roadmaps add column if not exists activated_at timestamptz;

-- If this create-index statement fails with a uniqueness violation, some
-- user already has more than one active roadmap in production — find them
-- first with:
--   select user_id, count(*) from public.roadmaps where status = 'active' group by user_id having count(*) > 1;
-- then archive all but the most recently activated row for each before
-- re-running this statement.
create unique index if not exists roadmaps_one_active_per_user
  on public.roadmaps (user_id) where (status = 'active');
