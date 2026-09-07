-- Solventia ambition calibration migration
-- Run this once in the Supabase SQL Editor. Safe to re-run (idempotent).
-- Additive only — nothing existing is dropped or rewritten.

-- ============================================================
-- business_dna — deterministic, pre-AI ambition calibration, computed
-- once per consultation from the same normalized_signals every other
-- deterministic system (Founder Genome, Fit Score) already reads. Never
-- inferred by the AI itself; this is CONTEXT handed to it (see
-- src/lib/profile/ambition.ts and intelligence-package.ts). All
-- nullable — existing rows simply have no calibration until the founder
-- redoes a consultation, which is correct: a stored calibration is a
-- point-in-time snapshot, never recomputed retroactively.
-- ============================================================
alter table public.business_dna add column if not exists ambition_band text;
alter table public.business_dna add column if not exists ambition_score integer;
alter table public.business_dna add column if not exists ambition_reason_codes jsonb;
alter table public.business_dna add column if not exists ambition_scoring_version integer;

-- ALTER TABLE ... ADD CONSTRAINT has no IF NOT EXISTS in Postgres, unlike
-- ADD COLUMN above — guard it explicitly so this file stays safe to re-run.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'business_dna_ambition_band_check'
  ) then
    alter table public.business_dna
      add constraint business_dna_ambition_band_check
      check (ambition_band is null or ambition_band in ('A', 'B', 'C', 'D', 'E'));
  end if;
end $$;
