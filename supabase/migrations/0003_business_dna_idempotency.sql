-- Solventia idempotency guard for Stage-7 submission
-- Run this once in the Supabase SQL Editor. Safe to re-run (idempotent).
--
-- Problem: completeConsultation only ever used plain .insert() calls, with
-- no guard against two overlapping SUCCESSFUL submissions for the same
-- user (a double-click, or a race between the in-page submit and
-- auth/callback's resumePendingConsultation) — each would create its own
-- full business_dna + 3x opportunities + 3x roadmaps row set.
--
-- Fix: a real UNIQUE constraint on (user_id, profile_hash), enforced by
-- Postgres itself — the only guard that's actually safe under true
-- concurrency (a check-then-insert in application code is not). Existing
-- pre-migration rows have profile_hash = NULL; Postgres treats NULLs as
-- distinct from each other in a unique index, so old rows never conflict
-- with each other or with new ones — no backfill needed.

drop index if exists business_dna_profile_hash_idx;
create unique index if not exists business_dna_user_profile_hash_key
  on public.business_dna (user_id, profile_hash)
  where profile_hash is not null;
