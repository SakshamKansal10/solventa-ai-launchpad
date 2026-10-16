-- READ-ONLY preflight for apply-0010-0011-0012.sql. Changes nothing.
-- Run in the Supabase SQL Editor first; every query should return what its comment says.

-- 1. The widened roadmaps.status check keeps every existing value valid.
--    Expect: only 'available', 'active' or 'archived' (all still allowed afterwards).
select status, count(*) from public.roadmaps group by status;

-- 2. Optional unique indexes are created only when no duplicates exist. These show
--    whether each will be created (empty result = created) or skipped with a notice.
select opportunity_id, count(*) from public.roadmaps group by 1 having count(*) > 1;
select week_id, order_index, count(*) from public.roadmap_tasks
 where week_id is not null group by 1, 2 having count(*) > 1;

-- 3. How many legacy Evidence Vault notes will be COPIED (not moved) into proof_evidence.
select count(*) as legacy_notes_to_copy from public.founder_evidence where char_length(content) > 0;

-- 4. The existing 'avatars' bucket (from the earlier avatar migration). 0010 keeps it
--    public and sets a 5 MB limit + jpeg/png/webp types on it.
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id in ('avatars', 'proof-files');

-- 5. Existing storage policies on avatars (0010 replaces "avatars_public_read" with an
--    identical definition and ADDS owner-only insert/update/delete policies).
select policyname, cmd from pg_policies where schemaname = 'storage' and tablename = 'objects'
 order by policyname;
