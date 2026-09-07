-- Solventia Founder Inbox migration
-- Run this once in the Supabase SQL Editor. Safe to re-run (idempotent).
-- Additive only — nothing existing is dropped or rewritten.

-- ============================================================
-- founder_notifications — the Founder Inbox. Real product events only
-- (ideas ready, roadmap ready, a week unlocked, a roadmap build
-- failed) — never a marketing/engagement nudge. Written by the same
-- server actions that already cause the event, best-effort (a failed
-- insert here must never fail the real action that triggered it — see
-- notifications.ts).
-- ============================================================
create table if not exists public.founder_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (
    type in ('ideas_ready', 'roadmap_ready', 'week_unlocked', 'roadmap_build_failed')
  ),
  title text not null,
  body text not null,
  -- App-relative path the notification should navigate to when clicked
  -- (e.g. "/dashboard/roadmap") — never an absolute URL.
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists founder_notifications_user_idx
  on public.founder_notifications (user_id, created_at desc);

alter table public.founder_notifications enable row level security;

drop policy if exists "founder_notifications_all_own" on public.founder_notifications;
create policy "founder_notifications_all_own" on public.founder_notifications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
