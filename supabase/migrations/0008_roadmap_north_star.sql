-- Solventia roadmap North Star migration
-- Run this once in the Supabase SQL Editor. Safe to re-run (idempotent).
-- Additive only — nothing existing is dropped or rewritten.

-- ============================================================
-- roadmaps — the one-sentence "what this whole roadmap is building
-- toward" generated alongside the skeleton (see generateRoadmapSkeleton
-- in roadmap-generation.ts) and shown once, prominently, near the top of
-- the roadmap page. Nullable — a roadmap generated before this migration
-- simply has none; the UI omits the line entirely rather than showing a
-- placeholder.
-- ============================================================
alter table public.roadmaps add column if not exists north_star text;
