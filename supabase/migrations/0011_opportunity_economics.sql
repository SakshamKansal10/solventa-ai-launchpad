-- Solventia Economics migration
-- Run this once in the Supabase SQL Editor. Safe to re-run (idempotent).
-- Additive only — nothing existing is dropped or rewritten.

-- ============================================================
-- opportunity_economics — the founder's OWN entered assumptions for one
-- opportunity's business model (never AI-generated: see
-- src/lib/actions/economics.ts). One row per opportunity. Every numeric
-- value here is explicitly an assumption, not a verified fact — the UI
-- labels them that way; nothing here is ever presented as certain.
-- Derived figures (monthly revenue at N customers, contribution,
-- break-even) are computed client-side from these raw inputs, live, and
-- are never persisted — persisting a derived number would let it drift
-- from the assumptions that produced it.
-- ============================================================
create table if not exists public.opportunity_economics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  opportunity_id uuid not null unique references public.opportunities (id) on delete cascade,
  revenue_model text,
  currency text not null default 'USD',
  price_per_customer numeric,
  direct_cost_per_customer numeric,
  customer_acquisition_note text,
  fixed_monthly_costs numeric,
  starting_budget numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.opportunity_economics enable row level security;

drop policy if exists "opportunity_economics_all_own" on public.opportunity_economics;
create policy "opportunity_economics_all_own" on public.opportunity_economics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
