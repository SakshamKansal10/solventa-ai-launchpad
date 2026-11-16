-- Redesign v2, part 4 feature 6: estimates and sources.
-- Additive only. Every market number found by a cited search is stored with its kind:
-- 'sourced' (it has a source URL; retrieved_at is the date it was looked up) or 'estimate'.
-- A direction's own numbers are estimates by construction (stored on the candidate JSON as
-- numberKind = 'estimate'), so they need no column.

alter table public.opportunity_evidence
  add column if not exists kind text
    check (kind in ('estimate', 'sourced'));

-- Existing rows: sourced when they carry a URL, otherwise an estimate. Fills only empty values.
update public.opportunity_evidence
  set kind = case when nullif(trim(source_url), '') is not null then 'sourced' else 'estimate' end
  where kind is null;
