-- Solventia reference-ownership RLS (hardening for 0010-0012)
-- Run after 0012. Safe to re-run (each policy is dropped and recreated by name).
-- Adds policies only — no table, column or row is changed.
--
-- Why: Postgres foreign-key checks bypass row-level security, and every owner
-- policy here only compares user_id with auth.uid(). So, through the public REST
-- API, a signed-in user could write a row of THEIR OWN that points at SOMEONE
-- ELSE's opportunity, assumption, roadmap, phase, week or mission. Nothing would
-- be readable across accounts, but where the reference is part of a global unique
-- index — proof_assumptions (opportunity_id, position), opportunity_economics
-- (opportunity_id), roadmaps (opportunity_id), roadmap_weeks (roadmap_id,
-- global_number), roadmap_tasks (week_id, order_index) — the row would squat the
-- real owner's slot and block their own writes.
--
-- Each policy below is RESTRICTIVE: Postgres ANDs it with the existing permissive
-- owner policy, so it can only narrow access, never widen it. USING (true) leaves
-- reads and deletes exactly as they are; WITH CHECK makes every INSERT and UPDATE
-- prove that each referenced row belongs to the caller. The EXISTS subqueries run
-- under the caller's own RLS and also compare user_id explicitly.
-- The service role (BYPASSRLS) and the table owner are unaffected.

-- roadmaps -> the opportunity it is built for
drop policy if exists "roadmaps_refs_owned" on public.roadmaps;
create policy "roadmaps_refs_owned" on public.roadmaps
  as restrictive for all
  using (true)
  with check (
    exists (
      select 1 from public.opportunities o
       where o.id = roadmaps.opportunity_id and o.user_id = auth.uid()
    )
  );

-- roadmap_phases -> their roadmap
drop policy if exists "roadmap_phases_refs_owned" on public.roadmap_phases;
create policy "roadmap_phases_refs_owned" on public.roadmap_phases
  as restrictive for all
  using (true)
  with check (
    exists (
      select 1 from public.roadmaps r
       where r.id = roadmap_phases.roadmap_id and r.user_id = auth.uid()
    )
  );

-- roadmap_weeks -> their phase and (0010) their roadmap
drop policy if exists "roadmap_weeks_refs_owned" on public.roadmap_weeks;
create policy "roadmap_weeks_refs_owned" on public.roadmap_weeks
  as restrictive for all
  using (true)
  with check (
    exists (
      select 1 from public.roadmap_phases p
       where p.id = roadmap_weeks.phase_id and p.user_id = auth.uid()
    )
    and (
      roadmap_weeks.roadmap_id is null
      or exists (
        select 1 from public.roadmaps r
         where r.id = roadmap_weeks.roadmap_id and r.user_id = auth.uid()
      )
    )
  );

-- roadmap_tasks (missions) -> their phase and their week
drop policy if exists "roadmap_tasks_refs_owned" on public.roadmap_tasks;
create policy "roadmap_tasks_refs_owned" on public.roadmap_tasks
  as restrictive for all
  using (true)
  with check (
    exists (
      select 1 from public.roadmap_phases p
       where p.id = roadmap_tasks.phase_id and p.user_id = auth.uid()
    )
    and (
      roadmap_tasks.week_id is null
      or exists (
        select 1 from public.roadmap_weeks w
         where w.id = roadmap_tasks.week_id and w.user_id = auth.uid()
      )
    )
  );

-- profiles -> the explicitly chosen direction (0010's active_opportunity_id)
drop policy if exists "profiles_refs_owned" on public.profiles;
create policy "profiles_refs_owned" on public.profiles
  as restrictive for all
  using (true)
  with check (
    profiles.active_opportunity_id is null
    or exists (
      select 1 from public.opportunities o
       where o.id = profiles.active_opportunity_id and o.user_id = auth.uid()
    )
  );

-- proof_assumptions -> their opportunity
drop policy if exists "proof_assumptions_refs_owned" on public.proof_assumptions;
create policy "proof_assumptions_refs_owned" on public.proof_assumptions
  as restrictive for all
  using (true)
  with check (
    exists (
      select 1 from public.opportunities o
       where o.id = proof_assumptions.opportunity_id and o.user_id = auth.uid()
    )
  );

-- proof_evidence -> its opportunity, its assumption (which must be on that same
-- opportunity), the mission and week that produced it, and (legacy rows only)
-- the old Evidence Vault note it was copied from
drop policy if exists "proof_evidence_refs_owned" on public.proof_evidence;
create policy "proof_evidence_refs_owned" on public.proof_evidence
  as restrictive for all
  using (true)
  with check (
    exists (
      select 1 from public.opportunities o
       where o.id = proof_evidence.opportunity_id and o.user_id = auth.uid()
    )
    and (
      proof_evidence.assumption_id is null
      or exists (
        select 1 from public.proof_assumptions a
         where a.id = proof_evidence.assumption_id
           and a.user_id = auth.uid()
           and a.opportunity_id = proof_evidence.opportunity_id
      )
    )
    and (
      proof_evidence.task_id is null
      or exists (
        select 1 from public.roadmap_tasks t
         where t.id = proof_evidence.task_id and t.user_id = auth.uid()
      )
    )
    and (
      proof_evidence.week_id is null
      or exists (
        select 1 from public.roadmap_weeks w
         where w.id = proof_evidence.week_id and w.user_id = auth.uid()
      )
    )
    and (
      proof_evidence.legacy_evidence_id is null
      or exists (
        select 1 from public.founder_evidence fe
         where fe.id = proof_evidence.legacy_evidence_id and fe.user_id = auth.uid()
      )
    )
  );

-- opportunity_economics -> its opportunity
drop policy if exists "opportunity_economics_refs_owned" on public.opportunity_economics;
create policy "opportunity_economics_refs_owned" on public.opportunity_economics
  as restrictive for all
  using (true)
  with check (
    exists (
      select 1 from public.opportunities o
       where o.id = opportunity_economics.opportunity_id and o.user_id = auth.uid()
    )
  );
