-- Solventia opportunity translation cache migration
-- Run this once in the Supabase SQL Editor. Safe to re-run (idempotent).
-- Additive only — nothing existing is dropped or rewritten.

-- ============================================================
-- opportunities.origin_locale — the language the opportunity's prose
-- (title/one_liner/who_for/candidate) was actually generated in. Needed so
-- switching the UI locale later knows whether a translation is required at
-- all, rather than re-translating content that's already in the requested
-- language. Defaults to 'en' for every pre-existing row, matching the
-- app's historical default generation locale.
-- ============================================================
alter table public.opportunities
  add column if not exists origin_locale text not null default 'en';

-- ============================================================
-- opportunity_translations — on-demand translation cache. Populated the
-- first time a founder views an opportunity in a locale different from its
-- origin_locale; never re-translated afterward for that (opportunity,
-- locale) pair.
-- ============================================================
create table if not exists public.opportunity_translations (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  locale text not null check (locale in ('en', 'hi')),
  title text not null,
  one_liner text not null,
  who_for text,
  candidate jsonb not null,
  created_at timestamptz not null default now(),
  unique (opportunity_id, locale)
);
create index if not exists opportunity_translations_user_idx
  on public.opportunity_translations (user_id);

alter table public.opportunity_translations enable row level security;

-- Founders can only ever read/write translation cache rows for their own
-- opportunities — never anyone else's.
drop policy if exists "opportunity_translations_select_own" on public.opportunity_translations;
create policy "opportunity_translations_select_own" on public.opportunity_translations
  for select using (auth.uid() = user_id);

drop policy if exists "opportunity_translations_insert_own" on public.opportunity_translations;
create policy "opportunity_translations_insert_own" on public.opportunity_translations
  for insert with check (auth.uid() = user_id);

drop policy if exists "opportunity_translations_update_own" on public.opportunity_translations;
create policy "opportunity_translations_update_own" on public.opportunity_translations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
