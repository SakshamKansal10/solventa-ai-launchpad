-- READ-ONLY preflight for apply-production-final.sql. Every statement is a SELECT;
-- nothing here changes data or schema. Run in the Supabase SQL Editor before the
-- apply and keep the output (rollback step R4 needs result 6).

-- 1. Postgres version (the scripts need 10+ for restrictive policies).
select version();

-- 2. roadmaps.status values. Expect only 'available', 'active', 'archived' — all
--    remain valid under the widened check.
select status, count(*) from public.roadmaps group by status order by status;

-- 3. Duplicate roadmaps per opportunity. Empty = roadmaps_one_per_opportunity is created.
select opportunity_id, count(*) from public.roadmaps group by 1 having count(*) > 1;

-- 4a. Duplicate week numbers the backfill would produce. Empty by construction
--     (row_number per roadmap) = roadmap_weeks_roadmap_number_key is created.
with numbered as (
  select p.roadmap_id,
         row_number() over (partition by p.roadmap_id order by p.order_index, w.order_index) as rn
    from public.roadmap_weeks w
    join public.roadmap_phases p on p.id = w.phase_id
)
select roadmap_id, rn, count(*) from numbered group by 1, 2 having count(*) > 1;

-- 4b. Weeks whose phase is missing (they would keep roadmap_id = null). Expect 0.
select count(*) as weeks_without_phase
  from public.roadmap_weeks w
 where not exists (select 1 from public.roadmap_phases p where p.id = w.phase_id);

-- 5. Duplicate mission positions in a week. Empty = roadmap_tasks_week_order_key is created.
select week_id, order_index, count(*) from public.roadmap_tasks
 where week_id is not null group by 1, 2 having count(*) > 1;

-- 6. Current storage buckets (record these: rollback step R4 restores 'avatars').
select id, public, file_size_limit, allowed_mime_types
  from storage.buckets where id in ('avatars', 'proof-files');

-- 7. Existing storage policies on storage.objects.
select policyname, permissive, roles, cmd
  from pg_policies where schemaname = 'storage' and tablename = 'objects'
 order by policyname;

-- 8. Does opportunities.opportunity_index already exist? (Expected on 2026-10-05: no row.)
select column_name, data_type from information_schema.columns
 where table_schema = 'public' and table_name = 'opportunities' and column_name = 'opportunity_index';

-- 9. Legacy Evidence Vault notes that will be COPIED (originals stay) into proof_evidence.
select count(*) as legacy_notes_to_copy from public.founder_evidence where char_length(content) > 0;

-- 10. Objects from 0010-0013 that already exist (expected: every query returns no rows).
select table_name from information_schema.tables
 where table_schema = 'public'
   and table_name in ('consultation_drafts', 'content_translations', 'proof_assumptions',
                      'proof_evidence', 'opportunity_economics');

select table_name, column_name from information_schema.columns
 where table_schema = 'public'
   and (table_name, column_name) in (
     ('profiles', 'locale'), ('profiles', 'avatar_path'), ('profiles', 'avatar_updated_at'),
     ('profiles', 'notification_prefs'), ('profiles', 'active_opportunity_id'),
     ('profiles', 'active_opportunity_set_at'), ('founder_notifications', 'params'),
     ('roadmaps', 'build_error'), ('roadmaps', 'completed_at'),
     ('roadmap_weeks', 'roadmap_id'), ('roadmap_weeks', 'global_number'),
     ('roadmap_weeks', 'generation_status'), ('roadmap_weeks', 'generation_started_at'),
     ('roadmap_weeks', 'generation_attempts'), ('roadmap_weeks', 'generation_error'),
     ('roadmap_weeks', 'reflection_outcome'), ('roadmap_weeks', 'reflection_blocker'),
     ('roadmap_weeks', 'reflection_note'), ('roadmap_weeks', 'closed_at'),
     ('roadmap_weeks', 'evidence_target'), ('roadmap_weeks', 'adaptation_note'),
     ('roadmap_tasks', 'steps'), ('roadmap_tasks', 'evidence_required'),
     ('roadmap_tasks', 'assumption_category'), ('roadmap_tasks', 'started_at'),
     ('roadmap_tasks', 'completed_at')
   );

select schemaname, tablename, policyname from pg_policies
 where policyname in (
   'avatars_insert_own', 'avatars_update_own', 'avatars_delete_own',
   'proof_files_select_own', 'proof_files_insert_own', 'proof_files_delete_own',
   'consultation_drafts_all_own', 'content_translations_all_own', 'proof_assumptions_all_own',
   'proof_evidence_all_own', 'opportunity_economics_all_own',
   'roadmaps_refs_owned', 'roadmap_phases_refs_owned', 'roadmap_weeks_refs_owned',
   'roadmap_tasks_refs_owned', 'profiles_refs_owned', 'proof_assumptions_refs_owned',
   'proof_evidence_refs_owned', 'opportunity_economics_refs_owned'
 );

select conname from pg_constraint
 where conname in ('profiles_locale_check', 'roadmap_weeks_generation_status_check',
                   'roadmap_weeks_reflection_outcome_check', 'proof_evidence_title_length');

select indexname from pg_indexes
 where schemaname = 'public'
   and indexname in ('roadmaps_one_per_opportunity', 'roadmap_weeks_roadmap_number_key',
                     'roadmap_tasks_week_order_key');

select id from storage.buckets where id = 'proof-files';

-- 11. Existing rows that reference ANOTHER user's row (they would fail the new
--     reference checks on their next update). Expect every count to be 0.
select
  (select count(*) from public.roadmaps r join public.opportunities o on o.id = r.opportunity_id
    where o.user_id <> r.user_id) as roadmaps_foreign_opportunity,
  (select count(*) from public.roadmap_phases p join public.roadmaps r on r.id = p.roadmap_id
    where r.user_id <> p.user_id) as phases_foreign_roadmap,
  (select count(*) from public.roadmap_weeks w join public.roadmap_phases p on p.id = w.phase_id
    where p.user_id <> w.user_id) as weeks_foreign_phase,
  (select count(*) from public.roadmap_tasks t join public.roadmap_phases p on p.id = t.phase_id
    where p.user_id <> t.user_id) as tasks_foreign_phase,
  (select count(*) from public.roadmap_tasks t join public.roadmap_weeks w on w.id = t.week_id
    where w.user_id <> t.user_id) as tasks_foreign_week;

-- 12. Table sizes, to estimate how long the apply holds its locks.
select
  (select count(*) from public.profiles) as profiles,
  (select count(*) from public.opportunities) as opportunities,
  (select count(*) from public.roadmaps) as roadmaps,
  (select count(*) from public.roadmap_phases) as roadmap_phases,
  (select count(*) from public.roadmap_weeks) as roadmap_weeks,
  (select count(*) from public.roadmap_tasks) as roadmap_tasks,
  (select count(*) from public.founder_notifications) as founder_notifications,
  (select count(*) from public.founder_evidence) as founder_evidence;
