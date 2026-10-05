-- ROLLBACK for apply-production-final.sql. NOT executed. Atomic (one transaction).
--
-- WARNING: run only if the new schema must be removed. After launch this DELETES
-- everything stored in the new tables and columns: Proof assumptions and evidence,
-- economics, saved consultation drafts, cached translations, language / avatar /
-- notification settings, chosen-direction pointers, structured week reflections,
-- mission steps and timestamps. Restoring the pre-apply backup is the better path
-- when that data matters. Roll the Vercel deployment back FIRST: the new frontend
-- expects this schema. Rows that existed before the apply are never deleted here.

begin;
set local lock_timeout = '10s';

-- R1. 0013 reference-ownership policies on pre-existing tables. Dropped first:
--     two of them depend on columns removed in R3. (0013's policies on the new
--     tables disappear with those tables in R2.)
drop policy if exists "roadmaps_refs_owned" on public.roadmaps;
drop policy if exists "roadmap_phases_refs_owned" on public.roadmap_phases;
drop policy if exists "roadmap_weeks_refs_owned" on public.roadmap_weeks;
drop policy if exists "roadmap_tasks_refs_owned" on public.roadmap_tasks;
drop policy if exists "profiles_refs_owned" on public.profiles;

-- R2. Tables created by 0010 / 0011 (their indexes, checks and policies go with them;
--     0012's title column and checks live on proof_evidence).
drop table if exists public.opportunity_economics;
drop table if exists public.proof_evidence;
drop table if exists public.proof_assumptions;
drop table if exists public.content_translations;
drop table if exists public.consultation_drafts;

-- R3. Columns, indexes and constraints 0010 added to pre-existing tables.
--     (Preflight confirmed none of these columns existed before the apply.)
alter table public.founder_notifications drop column if exists params;

drop index if exists public.roadmap_tasks_week_order_key;
alter table public.roadmap_tasks
  drop column if exists steps,
  drop column if exists evidence_required,
  drop column if exists assumption_category,
  drop column if exists started_at,
  drop column if exists completed_at;

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

drop index if exists public.roadmaps_one_per_opportunity;
alter table public.roadmaps drop column if exists build_error, drop column if exists completed_at;

alter table public.profiles drop constraint if exists profiles_locale_check;
alter table public.profiles
  drop column if exists locale,
  drop column if exists avatar_path,
  drop column if exists avatar_updated_at,
  drop column if exists notification_prefs,
  drop column if exists active_opportunity_id,
  drop column if exists active_opportunity_set_at;

-- R4. Storage: remove only what 0010 added. "avatars_public_read" stays (the earlier
--     avatar migration created the identical policy). The 'avatars' limits go back to
--     the values preflight result 6 recorded — NULL/NULL is what the earlier avatar
--     migration created; EDIT this line first if preflight showed anything else.
drop policy if exists "avatars_insert_own" on storage.objects;
drop policy if exists "avatars_update_own" on storage.objects;
drop policy if exists "avatars_delete_own" on storage.objects;
drop policy if exists "proof_files_select_own" on storage.objects;
drop policy if exists "proof_files_insert_own" on storage.objects;
drop policy if exists "proof_files_delete_own" on storage.objects;
update storage.buckets set file_size_limit = null, allowed_mime_types = null where id = 'avatars';
-- The 'proof-files' bucket is left in place: Storage only deletes an EMPTY bucket
-- (Dashboard > Storage > proof-files > delete files, then the bucket).

-- R5. roadmaps.status: put back the pre-0010 rule (available / active / archived).
--     NOT VALID: it applies to new and updated rows but does not re-check existing
--     ones, so a roadmap already marked building / completed / failed can neither
--     make this rollback fail nor be rewritten by it. Review such rows afterwards:
--       select id, status from public.roadmaps where status in ('building', 'completed', 'failed');
--     and once they are resolved:
--       alter table public.roadmaps validate constraint roadmaps_status_check;
alter table public.roadmaps drop constraint if exists roadmaps_status_check;
alter table public.roadmaps add constraint roadmaps_status_check
  check (status in ('available', 'active', 'archived')) not valid;

-- R6. opportunities.opportunity_index is deliberately KEPT. It is one nullable
--     column, harmless to every app version, and after launch it holds the AI's own
--     ranking of each consultation's directions. Production did NOT have it before
--     this apply (read-only check 2026-10-05; preflight result 8 confirms at apply
--     time). Only if it must go as well, and preflight result 8 returned no row:
--       alter table public.opportunities drop column if exists opportunity_index;

commit;
