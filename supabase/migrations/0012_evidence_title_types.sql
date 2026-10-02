-- Evidence gets an optional short title and three more ways to be recorded.
--
-- title: shown first in the evidence stream. Nullable and capped, so existing
-- rows are untouched and nothing about saving evidence gets stricter.
-- evidence_type: adds 'url', 'screenshot' and 'survey' alongside the existing
-- types. Re-runnable: the constraint is dropped and recreated by name.

alter table public.proof_evidence add column if not exists title text;

alter table public.proof_evidence drop constraint if exists proof_evidence_title_length;
alter table public.proof_evidence
  add constraint proof_evidence_title_length
  check (title is null or char_length(title) between 1 and 120);

alter table public.proof_evidence drop constraint if exists proof_evidence_evidence_type_check;
alter table public.proof_evidence
  add constraint proof_evidence_evidence_type_check
  check (
    evidence_type in (
      'interview', 'quote', 'payment', 'observation',
      'experiment', 'analytics', 'document', 'url',
      'screenshot', 'survey', 'other'
    )
  );
