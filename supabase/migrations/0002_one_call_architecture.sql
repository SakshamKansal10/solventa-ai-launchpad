-- Solventia one-call architecture migration
-- Run this once in the Supabase SQL Editor. Safe to re-run (idempotent).
-- Preserves all existing business_dna/opportunities/roadmap rows — this
-- only adds columns and widens a check constraint, nothing is dropped or
-- rewritten.

-- ============================================================
-- roadmaps.status — a roadmap can now exist for an opportunity that
-- isn't the founder's currently selected path yet ('available'), since
-- the one-call architecture pre-generates a full roadmap for all three
-- initial opportunities, not just whichever one gets selected.
-- ============================================================
alter table public.roadmaps drop constraint if exists roadmaps_status_check;
alter table public.roadmaps add constraint roadmaps_status_check
  check (status in ('available', 'active', 'archived'));
alter table public.roadmaps alter column status set default 'available';

-- ============================================================
-- roadmap_tasks — store the model's raw relative day offset (not just the
-- computed absolute date) so a roadmap that was pre-generated before being
-- selected can have its deadlines deterministically recalculated from
-- whenever it actually becomes active, not from whenever it was silently
-- pre-generated. Also: required/optional distinction and a plain-text
-- dependency reference (item 16).
-- ============================================================
alter table public.roadmap_tasks add column if not exists deadline_days_from_start int not null default 0;
alter table public.roadmap_tasks add column if not exists required boolean not null default true;
alter table public.roadmap_tasks add column if not exists depends_on text;

-- ============================================================
-- business_dna — telemetry for the one-call architecture (item 74) and a
-- profile hash so an unchanged profile never re-triggers Gemini (item 53).
-- ============================================================
alter table public.business_dna add column if not exists profile_hash text;
alter table public.business_dna add column if not exists initial_ai_calls int;
alter table public.business_dna add column if not exists generation_duration_ms int;
alter table public.business_dna add column if not exists prompt_version text;

create index if not exists business_dna_profile_hash_idx on public.business_dna (user_id, profile_hash);
