-- Redesign v2, part 4 feature 10: drop-off numbers for the owner.
-- Additive only. Requires 0017 (mission_stuck_events).
--
-- profiles.is_admin is set BY HAND by the owner (never by the app), e.g.:
--   update public.profiles set is_admin = true where email = '<owner email>';
-- The page reads one aggregate function. It runs with the definer's rights so it can count
-- across every founder, returns counts only (no names, no ids, no content), and refuses anyone
-- whose own profile is not marked admin.

alter table public.profiles add column if not exists is_admin boolean not null default false;

create or replace function public.admin_dropoff_counts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  with first_week as (
    select w.id, w.user_id, w.status
    from public.roadmap_weeks w
    where w.global_number = 1
  ),
  first_mission as (
    select distinct on (t.week_id) t.user_id, t.status
    from public.roadmap_tasks t
    join first_week fw on fw.id = t.week_id
    order by t.week_id, t.order_index
  )
  select jsonb_build_object(
    'consultation_finished', (select count(distinct user_id) from public.business_dna),
    'direction_chosen', (select count(distinct user_id) from public.opportunities where status = 'selected'),
    'roadmap_built', (select count(distinct user_id) from public.roadmaps where status in ('active', 'completed')),
    'mission1_started', (select count(distinct user_id) from first_mission where status in ('in_progress', 'done')),
    'mission1_done', (select count(distinct user_id) from first_mission where status = 'done'),
    'week1_done', (select count(distinct user_id) from first_week where status = 'completed'),
    'stuck', coalesce(
      (select jsonb_object_agg(reason, n)
       from (select reason, count(*) as n from public.mission_stuck_events group by reason) s),
      '{}'::jsonb
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_dropoff_counts() from public;
grant execute on function public.admin_dropoff_counts() to authenticated;
