-- Solventia opportunity_index migration
-- Run this once in the Supabase SQL Editor. Safe to re-run (idempotent).
-- Additive only — nothing existing is dropped or rewritten.

-- ============================================================
-- opportunities.opportunity_index — the AI's own 0/1/2 ranking within a
-- single consultation's 3 generated ideas (0 = the single strongest,
-- most worthy recommendation per the generation prompt), persisted so
-- the dashboard can resolve "the flagship idea" by the model's actual
-- designated ranking instead of a proxy (fit_score, which is a real but
-- SEPARATE deterministic score, not the same signal). Nullable — a row
-- from before this migration, or one added later via "Explore More"
-- (which has no single flagship among its batch), simply has none; the
-- dashboard falls back to fit_score ordering in that case, exactly the
-- prior behavior.
-- ============================================================
alter table public.opportunities add column if not exists opportunity_index int;
