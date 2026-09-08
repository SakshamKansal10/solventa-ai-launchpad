-- Solventia Feedback / Suggestions migration
-- Run this once in the Supabase SQL Editor. Safe to re-run (idempotent).
-- Additive only — nothing existing is dropped or rewritten.

-- ============================================================
-- feedback_submissions — free-text suggestions/feedback founders send
-- from the "Share Feedback" entry in the account menu. Never surfaced
-- back to other users; read only by the team, directly in Supabase.
-- ============================================================
create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);
create index if not exists feedback_submissions_user_idx
  on public.feedback_submissions (user_id, created_at desc);

alter table public.feedback_submissions enable row level security;

-- Founders can submit and see their own feedback, but never anyone else's.
drop policy if exists "feedback_submissions_insert_own" on public.feedback_submissions;
create policy "feedback_submissions_insert_own" on public.feedback_submissions
  for insert with check (auth.uid() = user_id);

drop policy if exists "feedback_submissions_select_own" on public.feedback_submissions;
create policy "feedback_submissions_select_own" on public.feedback_submissions
  for select using (auth.uid() = user_id);
