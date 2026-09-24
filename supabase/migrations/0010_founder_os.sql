-- Solventia Founder OS migration
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query > paste > Run).
-- Additive and idempotent: safe to re-run, nothing existing is dropped or
-- rewritten, every new table is RLS-protected. The application degrades
-- gracefully (English content, legacy generation path, "not available yet"
-- states) until this has been applied — but apply it BEFORE relying on the
-- Proof workspace, avatars, server-side consultation drafts, translations
-- or the week-generation lock.

-- ============================================================
-- profiles — language, avatar, notification preferences, and the explicit
-- "active direction" pointer used by History > Restore Direction.
-- ============================================================
-- locale is NULLABLE on purpose: NULL means "never chosen", which lets a
-- visitor's pre-signup language choice be adopted instead of overwritten.
alter table public.profiles add column if not exists locale text;
alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles add column if not exists avatar_updated_at timestamptz;
alter table public.profiles add column if not exists notification_prefs jsonb
  not null default '{"ideas_ready": true, "roadmap_ready": true, "week_unlocked": true}'::jsonb;
alter table public.profiles add column if not exists active_opportunity_id uuid
  references public.opportunities (id) on delete set null;
alter table public.profiles add column if not exists active_opportunity_set_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_locale_check') then
    alter table public.profiles
      add constraint profiles_locale_check check (locale is null or locale in ('en', 'hi'));
  end if;
end $$;

-- ============================================================
-- Storage: avatars (public read, owner-only write) and proof-files
-- (private, owner-only). A user can only ever touch objects inside a folder
-- named after their own auth.uid().
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'proof-files', 'proof-files', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "proof_files_select_own" on storage.objects;
create policy "proof_files_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'proof-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "proof_files_insert_own" on storage.objects;
create policy "proof_files_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'proof-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "proof_files_delete_own" on storage.objects;
create policy "proof_files_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'proof-files' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- consultation_drafts — server-side autosave of an in-progress
-- consultation (one row per user). Signed-out visitors keep using
-- localStorage; this only exists for authenticated users so a resume lands
-- on the exact unfinished question on any device.
-- ============================================================
create table if not exists public.consultation_drafts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  screen_key text,
  stage int,
  schema_version int not null default 2,
  locale text,
  updated_at timestamptz not null default now()
);

alter table public.consultation_drafts enable row level security;

drop policy if exists "consultation_drafts_all_own" on public.consultation_drafts;
create policy "consultation_drafts_all_own" on public.consultation_drafts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- content_translations — cache for translated AI content. The source hash
-- means a translation is invalidated ONLY when the original changes; the
-- unique key makes concurrent translation requests converge on one row.
-- ============================================================
create table if not exists public.content_translations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  locale text not null check (locale in ('en', 'hi')),
  source_hash text not null,
  payload_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists content_translations_key
  on public.content_translations (entity_type, entity_id, locale, source_hash);
create index if not exists content_translations_user_idx
  on public.content_translations (user_id, entity_type, entity_id);

alter table public.content_translations enable row level security;

drop policy if exists "content_translations_all_own" on public.content_translations;
create policy "content_translations_all_own" on public.content_translations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Proof: the critical assumptions a business must satisfy, and the
-- evidence a founder records against each. State (untested / weak signal /
-- mixed / supported / contradicted) is DERIVED from the evidence rows by
-- application code — deliberately not stored, so it can never drift from
-- the evidence that justifies it.
-- ============================================================
create table if not exists public.proof_assumptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  position int not null,
  title text not null,
  category text not null check (
    category in (
      'problem', 'willingness_to_pay', 'distribution', 'delivery',
      'retention', 'pricing', 'competition', 'other'
    )
  ),
  why_it_matters text,
  next_test text,
  -- How many independent supporting items count as "supported".
  success_threshold int not null default 3 check (success_threshold between 1 and 50),
  origin text not null default 'ai' check (origin in ('ai', 'template', 'user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- (opportunity_id, position) is the idempotency key for assumption
-- generation: two concurrent first-opens converge on one set.
create unique index if not exists proof_assumptions_opportunity_position_key
  on public.proof_assumptions (opportunity_id, position);
create index if not exists proof_assumptions_user_idx on public.proof_assumptions (user_id);

alter table public.proof_assumptions enable row level security;

drop policy if exists "proof_assumptions_all_own" on public.proof_assumptions;
create policy "proof_assumptions_all_own" on public.proof_assumptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.proof_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  -- Nullable only for notes migrated from the old Evidence Vault, which
  -- pre-date assumptions; new evidence always names its assumption.
  assumption_id uuid references public.proof_assumptions (id) on delete cascade,
  evidence_type text not null check (
    evidence_type in (
      'interview', 'quote', 'payment', 'observation',
      'experiment', 'analytics', 'document', 'other'
    )
  ),
  source_person text,
  occurred_on date not null default current_date,
  summary text not null check (char_length(summary) between 1 and 2000),
  signal text not null default 'neutral' check (signal in ('supports', 'neutral', 'contradicts')),
  url text,
  file_path text,
  file_name text,
  -- Set when the evidence was recorded from a roadmap mission.
  task_id uuid references public.roadmap_tasks (id) on delete set null,
  week_id uuid references public.roadmap_weeks (id) on delete set null,
  legacy_evidence_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proof_evidence_assumption_idx
  on public.proof_evidence (assumption_id, occurred_on desc);
create index if not exists proof_evidence_opportunity_idx
  on public.proof_evidence (opportunity_id, created_at desc);
create index if not exists proof_evidence_week_idx on public.proof_evidence (week_id);
create unique index if not exists proof_evidence_legacy_key
  on public.proof_evidence (legacy_evidence_id) where legacy_evidence_id is not null;

alter table public.proof_evidence enable row level security;

drop policy if exists "proof_evidence_all_own" on public.proof_evidence;
create policy "proof_evidence_all_own" on public.proof_evidence
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Carry the old Evidence Vault's notes forward (unassigned, neutral) so no
-- founder loses anything they typed. Re-runnable: legacy_evidence_id is unique.
insert into public.proof_evidence (
  user_id, opportunity_id, assumption_id, evidence_type, source_person, occurred_on,
  summary, signal, legacy_evidence_id, created_at
)
select
  fe.user_id,
  fe.opportunity_id,
  null,
  case fe.entry_type when 'interview' then 'interview' when 'observation' then 'observation' else 'other' end,
  fe.customer_type,
  coalesce(fe.interview_date, fe.created_at::date),
  left(
    fe.content
      || case when fe.key_quote is not null and fe.key_quote <> '' then E'\nQuote: ' || fe.key_quote else '' end,
    2000
  ),
  'neutral',
  fe.id,
  fe.created_at
from public.founder_evidence fe
where char_length(fe.content) > 0
on conflict do nothing;

-- ============================================================
-- Roadmap state machine.
-- roadmaps.status gains building / completed / failed. Week and mission
-- states are derived in application code from these columns + task rows.
-- ============================================================
alter table public.roadmaps drop constraint if exists roadmaps_status_check;
alter table public.roadmaps add constraint roadmaps_status_check
  check (status in ('available', 'building', 'active', 'completed', 'failed', 'archived'));
alter table public.roadmaps add column if not exists build_error text;
alter table public.roadmaps add column if not exists completed_at timestamptz;

-- One roadmap per opportunity (existing code already reuses it). Created only
-- if no duplicates exist so this migration can never fail on old data.
do $$
begin
  if not exists (
    select 1 from public.roadmaps group by opportunity_id having count(*) > 1
  ) then
    create unique index if not exists roadmaps_one_per_opportunity
      on public.roadmaps (opportunity_id);
  else
    raise notice 'roadmaps_one_per_opportunity skipped: duplicate roadmaps exist for an opportunity';
  end if;
end $$;

alter table public.roadmap_weeks add column if not exists roadmap_id uuid
  references public.roadmaps (id) on delete cascade;
alter table public.roadmap_weeks add column if not exists global_number int;

update public.roadmap_weeks w
   set roadmap_id = p.roadmap_id
  from public.roadmap_phases p
 where p.id = w.phase_id and w.roadmap_id is null;

with numbered as (
  select w.id,
         row_number() over (partition by p.roadmap_id order by p.order_index, w.order_index) as rn
    from public.roadmap_weeks w
    join public.roadmap_phases p on p.id = w.phase_id
)
update public.roadmap_weeks w
   set global_number = n.rn
  from numbered n
 where n.id = w.id and w.global_number is null;

do $$
begin
  if not exists (
    select 1 from public.roadmap_weeks
     where roadmap_id is not null and global_number is not null
     group by roadmap_id, global_number having count(*) > 1
  ) then
    create unique index if not exists roadmap_weeks_roadmap_number_key
      on public.roadmap_weeks (roadmap_id, global_number)
      where roadmap_id is not null and global_number is not null;
  else
    raise notice 'roadmap_weeks_roadmap_number_key skipped: duplicate week numbers exist';
  end if;
end $$;

-- Generation lock. 'generating' + a fresh generation_started_at means one
-- request owns this week's detail generation; everyone else waits/polls.
alter table public.roadmap_weeks add column if not exists generation_status text
  not null default 'idle';
alter table public.roadmap_weeks add column if not exists generation_started_at timestamptz;
alter table public.roadmap_weeks add column if not exists generation_attempts int not null default 0;
alter table public.roadmap_weeks add column if not exists generation_error text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'roadmap_weeks_generation_status_check') then
    alter table public.roadmap_weeks
      add constraint roadmap_weeks_generation_status_check
      check (generation_status in ('idle', 'generating', 'ready', 'failed'));
  end if;
end $$;

-- Weeks that already have their detail are 'ready'.
update public.roadmap_weeks w
   set generation_status = 'ready'
 where generation_status = 'idle'
   and (w.mission is not null or exists (select 1 from public.roadmap_tasks t where t.week_id = w.id));

-- Structured week-close reflection + evidence target.
alter table public.roadmap_weeks add column if not exists reflection_outcome text;
alter table public.roadmap_weeks add column if not exists reflection_blocker text;
alter table public.roadmap_weeks add column if not exists reflection_note text;
alter table public.roadmap_weeks add column if not exists closed_at timestamptz;
alter table public.roadmap_weeks add column if not exists evidence_target int;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'roadmap_weeks_reflection_outcome_check') then
    alter table public.roadmap_weeks
      add constraint roadmap_weeks_reflection_outcome_check
      check (reflection_outcome is null or reflection_outcome in ('stronger', 'as_expected', 'weaker', 'mixed'));
  end if;
end $$;

-- Missions (roadmap_tasks): short step bullets, evidence flag, timestamps.
alter table public.roadmap_tasks add column if not exists steps jsonb;
alter table public.roadmap_tasks add column if not exists evidence_required boolean not null default false;
alter table public.roadmap_tasks add column if not exists assumption_category text;
alter table public.roadmap_tasks add column if not exists started_at timestamptz;
alter table public.roadmap_tasks add column if not exists completed_at timestamptz;

-- A week can never hold two missions at the same position (duplicate
-- generation guard). Skipped, not failed, if old race-created duplicates exist:
--   select week_id, order_index, count(*) from public.roadmap_tasks
--    where week_id is not null group by 1, 2 having count(*) > 1;
do $$
begin
  if not exists (
    select 1 from public.roadmap_tasks where week_id is not null
     group by week_id, order_index having count(*) > 1
  ) then
    create unique index if not exists roadmap_tasks_week_order_key
      on public.roadmap_tasks (week_id, order_index) where week_id is not null;
  else
    raise notice 'roadmap_tasks_week_order_key skipped: duplicate missions exist in a week';
  end if;
end $$;
