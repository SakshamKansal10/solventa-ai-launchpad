-- Redesign v2, part 4 feature 2: proof that updates itself. Additive only. The app detects the
-- columns and keeps the evidence-only status until this is applied.

-- Which mission checks the assumption, and the rule that decides it from that mission's logs,
-- e.g. {"metric":"interviews.answer","equals":"yes","threshold":3,"outOf":4}. Status is derived
-- in code; nothing here ever stores a status.
alter table public.proof_assumptions add column if not exists check_task_id uuid
  references public.roadmap_tasks (id) on delete set null;
alter table public.proof_assumptions add column if not exists success_rule jsonb;

-- "Add other proof": a note or photo from outside a mission. Shown, marked "added by you", never
-- changes a rule-based status.
alter table public.proof_evidence add column if not exists added_by_user boolean not null default false;
