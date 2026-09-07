-- Solventia just-in-time week generation + Evidence Vault migration
-- Run this once in the Supabase SQL Editor. Safe to re-run (idempotent).
-- Additive only — nothing existing is dropped or rewritten.

-- ============================================================
-- roadmap_weeks — richer "active week" detail, generated JIT (only when
-- a week actually unlocks, never all 52 weeks up front). Nullable: a
-- week whose detail hasn't been generated yet (still locked, or
-- generated before this migration) simply has nulls here and the UI
-- falls back to showing just title/objective, exactly as it already
-- does for a locked week.
-- ============================================================
alter table public.roadmap_weeks add column if not exists mission text;
alter table public.roadmap_weeks add column if not exists mistakes_to_avoid jsonb;
alter table public.roadmap_weeks add column if not exists evidence_required text;
alter table public.roadmap_weeks add column if not exists success_threshold text;
-- Founder's own short reflection when they finish a week — the real
-- "evidence" fed into generating the NEXT week's detail, so week 2+
-- actually adapts instead of following a plan frozen at roadmap creation.
alter table public.roadmap_weeks add column if not exists founder_reflection text;

-- ============================================================
-- founder_evidence — the Evidence Vault. Structured, founder-submitted
-- real-world signal (interview notes, observations, pricing data) tied
-- to one opportunity, organized by the category it speaks to. Never
-- AI-generated content — this table only ever holds what a founder
-- actually typed.
-- ============================================================
create table if not exists public.founder_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  category text not null check (
    category in ('problem', 'customer', 'demand', 'price', 'competition', 'product', 'channel', 'economics')
  ),
  entry_type text not null default 'note' check (entry_type in ('interview', 'note', 'observation')),
  -- Interview-specific structured fields — null for a plain note/observation.
  customer_type text,
  interview_date date,
  key_quote text,
  pain_severity text check (pain_severity in ('low', 'medium', 'high')),
  existing_workaround text,
  willingness_to_pay text check (willingness_to_pay in ('no', 'maybe', 'yes')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists founder_evidence_opportunity_idx
  on public.founder_evidence (opportunity_id, created_at desc);

alter table public.founder_evidence enable row level security;

drop policy if exists "founder_evidence_all_own" on public.founder_evidence;
create policy "founder_evidence_all_own" on public.founder_evidence
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
