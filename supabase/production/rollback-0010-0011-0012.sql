-- ROLLBACK for apply-0010-0011-0012.sql — only if the new schema must be removed.
--
-- WARNING: this DELETES everything stored in the new tables and columns since the
-- apply (Proof assumptions and evidence, economics, saved drafts, translations,
-- notification preferences, chosen-direction pointers, week reflections). Restore
-- from the pre-apply backup instead if that data matters. Roll the Vercel deployment
-- back FIRST: the new frontend expects this schema.
-- Rows that existed before the apply are never deleted by this script.

begin;

-- 0012 -----------------------------------------------------------------------
-- (proof_evidence is dropped below, which removes its title column and checks.)

-- 0011 -----------------------------------------------------------------------
drop table if exists public.opportunity_economics;

-- 0010: Proof, drafts, translations ---------------------------------------
drop table if exists public.proof_evidence;
drop table if exists public.proof_assumptions;
drop table if exists public.content_translations;
drop table if exists public.consultation_drafts;

-- 0010: notifications ------------------------------------------------------
alter table public.founder_notifications drop column if exists params;

-- 0010: missions --------------------------------------------------------------
drop index if exists public.roadmap_tasks_week_order_key;
alter table public.roadmap_tasks
  drop column if exists steps,
  drop column if exists evidence_required,
  drop column if exists assumption_category,
  drop column if exists started_at,
  drop column if exists completed_at;

-- 0010: weeks -----------------------------------------------------------------
drop index if exists public.roadmap_weeks_roadmap_number_key;
alter table public.roadmap_weeks
  drop constraint if exists roadmap_weeks_generation_status_check,
  drop constraint if exists roadmap_weeks_reflection_outcome_check;
alter table public.roadmap_weeks
  drop column if exists roadmap_id,
  drop column if exists global_number,
  drop column if exists generation_status,
  drop column if exists generation_started_at,
  drop column if exists generation_attempts,
  drop column if exists generation_error,
  drop column if exists reflection_outcome,
  drop column if exists reflection_blocker,
  drop column if exists reflection_note,
  drop column if exists closed_at,
  drop column if exists evidence_target,
  drop column if exists adaptation_note;

-- 0010: roadmaps — restore the pre-0010 status check (from 0002). This FAILS if any
-- roadmap now has status building/completed/failed; set those back first, e.g.
--   update public.roadmaps set status = 'active' where status in ('building', 'completed', 'failed');
drop index if exists public.roadmaps_one_per_opportunity;
alter table public.roadmaps drop column if exists build_error, drop column if exists completed_at;
alter table public.roadmaps drop constraint if exists roadmaps_status_check;
alter table public.roadmaps add constraint roadmaps_status_check
  check (status in ('available', 'active', 'archived'));

-- 0010: profiles --------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_locale_check;
alter table public.profiles
  drop column if exists locale,
  drop column if exists avatar_path,
  drop column if exists avatar_updated_at,
  drop column if exists notification_prefs,
  drop column if exists active_opportunity_id,
  drop column if exists active_opportunity_set_at;

-- 0010: storage — remove only what 0010 added. "avatars_public_read" is left in
-- place: the earlier avatar migration created the identical policy.
drop policy if exists "avatars_insert_own" on storage.objects;
drop policy if exists "avatars_update_own" on storage.objects;
drop policy if exists "avatars_delete_own" on storage.objects;
drop policy if exists "proof_files_select_own" on storage.objects;
drop policy if exists "proof_files_insert_own" on storage.objects;
drop policy if exists "proof_files_delete_own" on storage.objects;
update storage.buckets set file_size_limit = null, allowed_mime_types = null where id = 'avatars';
-- The 'proof-files' bucket can only be deleted once it is empty (Dashboard > Storage).

commit;
