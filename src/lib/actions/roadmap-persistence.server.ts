import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import type { RoadmapPlan, RoadmapSkeletonPlan, RoadmapWeekDetailPlan } from "@/lib/ai/schemas";
import { MODEL } from "@/lib/ai/gemini.server";

function computeDeadline(referenceDate: Date, daysFromStart: number): string {
  return new Date(referenceDate.getTime() + daysFromStart * 86_400_000).toISOString().slice(0, 10);
}

/** Inserts phases/weeks/tasks for a roadmap plan, computing each task's
 * absolute deadline deterministically from `referenceDate` (never
 * AI-guessed — see item 19). The raw relative offset is stored too, so a
 * roadmap that was pre-generated before being selected can have its dates
 * recalculated from whenever it actually starts (see activateRoadmap
 * below). Only the very first week of the very first phase in `plan`
 * unlocks immediately ("active") — every other week starts "locked" and
 * is unlocked progressively as the founder finishes the week before it
 * (see unlockNextWeek). This is correct both for a brand-new roadmap
 * (plan's first week really is week 1) and for a replan (plan only ever
 * contains the remaining, not-yet-done work — its first week is
 * genuinely what the founder should do next). */
export async function persistRoadmapPlan(
  supabase: SupabaseClient<Database>,
  userId: string,
  roadmapId: string,
  plan: RoadmapPlan,
  startPhaseIndex: number,
  referenceDate: Date,
): Promise<void> {
  let isFirstWeekOverall = true;

  for (let i = 0; i < plan.phases.length; i++) {
    const phase = plan.phases[i];
    const { data: phaseRow, error: phaseError } = await supabase
      .from("roadmap_phases")
      .insert({
        roadmap_id: roadmapId,
        user_id: userId,
        order_index: startPhaseIndex + i,
        key: phase.key,
        title: phase.title,
        description: phase.description,
      })
      .select("id")
      .single();
    if (phaseError || !phaseRow)
      throw new Error(phaseError?.message ?? "Failed to save roadmap phase");

    for (let w = 0; w < phase.weeks.length; w++) {
      const week = phase.weeks[w];
      const active = isFirstWeekOverall;
      isFirstWeekOverall = false;

      const { data: weekRow, error: weekError } = await supabase
        .from("roadmap_weeks")
        .insert({
          phase_id: phaseRow.id,
          user_id: userId,
          order_index: w,
          week_number: week.weekNumber,
          title: week.title,
          objective: week.objective,
          status: active ? "active" : "locked",
          unlocked_at: active ? referenceDate.toISOString() : null,
        })
        .select("id")
        .single();
      if (weekError || !weekRow)
        throw new Error(weekError?.message ?? "Failed to save roadmap week");

      const taskRows = week.tasks.map((task, taskIndex) => ({
        phase_id: phaseRow.id,
        week_id: weekRow.id,
        user_id: userId,
        order_index: taskIndex,
        what: task.what,
        why: task.why,
        how: task.how,
        resource: task.resource,
        time_estimate: task.timeEstimate,
        deadline_days_from_start: task.deadlineDaysFromStart,
        deadline: computeDeadline(referenceDate, task.deadlineDaysFromStart),
        done_when: task.doneWhen,
        required: task.required,
        depends_on: task.dependsOn,
        status: "pending" as const,
      }));
      const { error: taskError } = await supabase.from("roadmap_tasks").insert(taskRows);
      if (taskError) throw new Error(taskError.message);
    }
  }
}

/** Inserts phases/weeks (NO tasks) for a roadmap skeleton — the
 * just-in-time counterpart to persistRoadmapPlan above. Only the first
 * week overall is marked "active"; every other week is "locked" with no
 * task detail at all yet (generated later, on unlock — see
 * generateWeekDetail / persistWeekDetail below). Returns the id of that
 * first ("active") week so the caller can immediately generate its
 * detail — a roadmap with an active week and zero tasks is a transient,
 * not a valid resting state. */
export async function persistRoadmapSkeleton(
  supabase: SupabaseClient<Database>,
  userId: string,
  roadmapId: string,
  skeleton: RoadmapSkeletonPlan,
  referenceDate: Date,
): Promise<{ firstWeekId: string }> {
  let isFirstWeekOverall = true;
  let firstWeekId: string | null = null;

  for (let i = 0; i < skeleton.phases.length; i++) {
    const phase = skeleton.phases[i];
    const { data: phaseRow, error: phaseError } = await supabase
      .from("roadmap_phases")
      .insert({
        roadmap_id: roadmapId,
        user_id: userId,
        order_index: i,
        key: phase.key,
        title: phase.title,
        description: phase.description,
      })
      .select("id")
      .single();
    if (phaseError || !phaseRow)
      throw new Error(phaseError?.message ?? "Failed to save roadmap phase");

    for (let w = 0; w < phase.weeks.length; w++) {
      const week = phase.weeks[w];
      const active = isFirstWeekOverall;
      isFirstWeekOverall = false;

      const { data: weekRow, error: weekError } = await supabase
        .from("roadmap_weeks")
        .insert({
          phase_id: phaseRow.id,
          user_id: userId,
          order_index: w,
          week_number: week.weekNumber,
          title: week.title,
          objective: week.objective,
          status: active ? "active" : "locked",
          unlocked_at: active ? referenceDate.toISOString() : null,
        })
        .select("id")
        .single();
      if (weekError || !weekRow)
        throw new Error(weekError?.message ?? "Failed to save roadmap week");

      if (active) firstWeekId = weekRow.id;
    }
  }

  if (!firstWeekId) throw new Error("Roadmap skeleton produced no weeks");
  return { firstWeekId };
}

/** Fills in one week's real detail exactly when it unlocks — the
 * mission, its tasks, mistakes to avoid, and evidence/success framing.
 * `referenceDate` is always "now" (the actual moment this week unlocks —
 * roadmap creation for week 1, or whenever the founder finishes the
 * prior week for every week after), never the roadmap's original start:
 * a week that unlocks 3 weeks late because the founder took longer on
 * the prior one should count its own 7 days from today, not from a
 * calendar date that's already in the past — same philosophy as
 * activateRoadmap's "day 3 means day 3 of actually resuming". Task
 * deadlineDaysFromStart is therefore WEEK-relative (0-6), not
 * roadmap-relative. */
export async function persistWeekDetail(
  supabase: SupabaseClient<Database>,
  userId: string,
  weekId: string,
  phaseId: string,
  detail: RoadmapWeekDetailPlan,
  referenceDate: Date,
): Promise<void> {
  const { error: updateError } = await supabase
    .from("roadmap_weeks")
    .update({
      mission: detail.mission,
      mistakes_to_avoid:
        detail.mistakesToAvoid as unknown as Database["public"]["Tables"]["roadmap_weeks"]["Row"]["mistakes_to_avoid"],
      evidence_required: detail.evidenceRequired,
      success_threshold: detail.successThreshold,
    })
    .eq("id", weekId)
    .eq("user_id", userId);
  if (updateError) throw new Error(updateError.message);

  const taskRows = detail.tasks.map((task, taskIndex) => {
    // Clamp into this week's real 0-6 day window regardless of what the
    // model returned — a stray out-of-range value must never place a
    // task's due date outside the week it belongs to.
    const dayInWeek = Math.min(Math.max(Math.round(task.deadlineDaysFromStart), 0), 6);
    return {
      phase_id: phaseId,
      week_id: weekId,
      user_id: userId,
      order_index: taskIndex,
      what: task.what,
      why: task.why,
      how: task.how,
      resource: task.resource,
      time_estimate: task.timeEstimate,
      deadline_days_from_start: dayInWeek,
      deadline: computeDeadline(referenceDate, dayInWeek),
      done_when: task.doneWhen,
      required: task.required,
      depends_on: task.dependsOn,
      status: "pending" as const,
    };
  });
  const { error: taskError } = await supabase.from("roadmap_tasks").insert(taskRows);
  if (taskError) throw new Error(taskError.message);
}

/** Creates a roadmap row + its full phase/week/task tree for one
 * opportunity — called once, on-demand, when a founder clicks "Build My
 * Roadmap" for their selected opportunity. */
export async function createRoadmap(
  supabase: SupabaseClient<Database>,
  userId: string,
  opportunityId: string,
  plan: RoadmapPlan,
  status: "active" | "available",
): Promise<string> {
  const now = new Date();
  const { data: roadmapRow, error } = await supabase
    .from("roadmaps")
    .insert({
      user_id: userId,
      opportunity_id: opportunityId,
      status,
      ai_model: MODEL,
      activated_at: status === "active" ? now.toISOString() : null,
    })
    .select("id")
    .single();
  if (error || !roadmapRow) throw new Error(error?.message ?? "Failed to create roadmap");

  await persistRoadmapPlan(supabase, userId, roadmapRow.id, plan, 0, now);
  return roadmapRow.id;
}

/** The real "Build My Roadmap" entry point — creates the roadmap row and
 * its skeleton (phases/weeks, no tasks yet). Returns the roadmap id and
 * the first week's full context so the caller can immediately generate
 * Week 1's detail (see generateWeekDetail) — a freshly-built roadmap
 * with an active week and no tasks is a transient state the caller must
 * resolve in the same request, not a valid resting state. */
export async function createRoadmapFromSkeleton(
  supabase: SupabaseClient<Database>,
  userId: string,
  opportunityId: string,
  skeleton: RoadmapSkeletonPlan,
): Promise<{ roadmapId: string; firstWeek: UnlockedWeekContext }> {
  const now = new Date();
  const { data: roadmapRow, error } = await supabase
    .from("roadmaps")
    .insert({
      user_id: userId,
      opportunity_id: opportunityId,
      status: "active" as const,
      ai_model: MODEL,
      activated_at: now.toISOString(),
    })
    .select("id")
    .single();
  if (error || !roadmapRow) throw new Error(error?.message ?? "Failed to create roadmap");

  const { firstWeekId } = await persistRoadmapSkeleton(
    supabase,
    userId,
    roadmapRow.id,
    skeleton,
    now,
  );

  const { data: weekRowRaw, error: weekError } = await supabase
    .from("roadmap_weeks")
    .select("id, phase_id, week_number, title, objective, roadmap_phases(title, description)")
    .eq("id", firstWeekId)
    .single();
  if (weekError || !weekRowRaw) throw new Error(weekError?.message ?? "Failed to load first week");
  const weekRow = weekRowRaw as unknown as {
    id: string;
    phase_id: string;
    week_number: number;
    title: string;
    objective: string;
    roadmap_phases: { title: string; description: string | null };
  };
  const phase = weekRow.roadmap_phases;

  return {
    roadmapId: roadmapRow.id,
    firstWeek: {
      id: weekRow.id,
      phaseId: weekRow.phase_id,
      weekNumber: weekRow.week_number,
      title: weekRow.title,
      objective: weekRow.objective,
      phaseTitle: phase.title,
      phaseDescription: phase.description ?? "",
    },
  };
}

/** Reactivating a roadmap that already exists (previously built, then
 * archived when the founder switched ideas) needs zero Gemini calls —
 * just recompute deadlines for its not-yet-done tasks relative to right
 * now, since "day 3" should mean day 3 of actually resuming, not day 3 of
 * whenever it was first built, then flip it to active. Completed
 * tasks/weeks keep their real history untouched — a founder resuming a
 * roadmap picks up exactly where they left off, nothing re-locks. */
export async function activateRoadmap(
  supabase: SupabaseClient<Database>,
  userId: string,
  roadmapId: string,
): Promise<void> {
  const now = new Date();

  const { data: phases, error } = await supabase
    .from("roadmap_phases")
    .select("id, roadmap_tasks(id, deadline_days_from_start, status)")
    .eq("roadmap_id", roadmapId);
  if (error) throw new Error(error.message);

  const pendingTasks = (phases ?? []).flatMap(
    (p) =>
      (
        p as unknown as {
          roadmap_tasks: { id: string; deadline_days_from_start: number; status: string }[];
        }
      ).roadmap_tasks,
  );

  await Promise.all(
    pendingTasks
      .filter((t) => t.status !== "done")
      .map((t) =>
        supabase
          .from("roadmap_tasks")
          .update({ deadline: computeDeadline(now, t.deadline_days_from_start) })
          .eq("id", t.id),
      ),
  );

  const { error: activateError } = await supabase
    .from("roadmaps")
    .update({ status: "active", activated_at: now.toISOString() })
    .eq("id", roadmapId)
    .eq("user_id", userId);
  if (activateError) throw new Error(activateError.message);
}

/** Archives whichever roadmap is currently active for this user, if any —
 * preserves its progress/history rather than deleting it, so switching
 * back later reactivates it instead of needing regeneration. */
export async function archiveActiveRoadmap(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  await supabase
    .from("roadmaps")
    .update({ status: "archived" })
    .eq("user_id", userId)
    .eq("status", "active");
}

export interface UnlockedWeekContext {
  id: string;
  phaseId: string;
  weekNumber: number;
  title: string;
  objective: string;
  phaseTitle: string;
  phaseDescription: string;
}

export interface UnlockNextWeekResult {
  completedWeekTitle: string;
  completedTaskWhats: string[];
  /** Null when the founder just finished the roadmap's last week — there
   * is nothing left to unlock. */
  nextWeek: UnlockedWeekContext | null;
}

/** Called after a task is marked done, when it turns out to have been the
 * last remaining task in its week: marks that week completed (with the
 * founder's own optional reflection — the real signal that makes the
 * next week's generation adaptive, not just a frozen plan) and unlocks
 * whatever comes next (the next week in the same phase, or if none, the
 * first week of the next phase). Never locks anything back — unlocking
 * is one-directional. Returns everything the caller needs to generate
 * the newly-unlocked week's detail (see generateWeekDetail) without a
 * second round-trip. */
export async function unlockNextWeek(
  supabase: SupabaseClient<Database>,
  userId: string,
  weekId: string,
  founderReflection: string | null,
): Promise<UnlockNextWeekResult> {
  const now = new Date().toISOString();

  const { data: weekRaw, error } = await supabase
    .from("roadmap_weeks")
    .select("id, phase_id, order_index, title, roadmap_tasks(what, status)")
    .eq("id", weekId)
    .single();
  if (error || !weekRaw) throw new Error(error?.message ?? "Roadmap week not found");
  const week = weekRaw as unknown as {
    id: string;
    phase_id: string;
    order_index: number;
    title: string;
    roadmap_tasks: { what: string; status: string }[];
  };

  await supabase
    .from("roadmap_weeks")
    .update({ status: "completed", completed_at: now, founder_reflection: founderReflection })
    .eq("id", weekId)
    .eq("user_id", userId);

  const completedTaskWhats = week.roadmap_tasks
    .filter((t) => t.status === "done")
    .map((t) => t.what);

  const { data: nextInPhase } = await supabase
    .from("roadmap_weeks")
    .select("id, phase_id, week_number, title, objective")
    .eq("phase_id", week.phase_id)
    .eq("order_index", week.order_index + 1)
    .maybeSingle();

  let nextWeekRow = nextInPhase ?? null;
  let nextPhaseRow: { id: string; title: string; description: string | null } | null = null;

  if (nextWeekRow) {
    const { data: samePhase } = await supabase
      .from("roadmap_phases")
      .select("id, title, description")
      .eq("id", week.phase_id)
      .single();
    nextPhaseRow = samePhase ?? null;
  } else {
    const { data: phase } = await supabase
      .from("roadmap_phases")
      .select("roadmap_id, order_index")
      .eq("id", week.phase_id)
      .single();

    if (phase) {
      const { data: nextPhase } = await supabase
        .from("roadmap_phases")
        .select("id, title, description")
        .eq("roadmap_id", phase.roadmap_id)
        .eq("order_index", phase.order_index + 1)
        .maybeSingle();

      if (nextPhase) {
        nextPhaseRow = nextPhase;
        const { data: firstWeekOfNextPhase } = await supabase
          .from("roadmap_weeks")
          .select("id, phase_id, week_number, title, objective")
          .eq("phase_id", nextPhase.id)
          .order("order_index", { ascending: true })
          .limit(1)
          .maybeSingle();
        nextWeekRow = firstWeekOfNextPhase ?? null;
      }
    }
  }

  if (nextWeekRow) {
    await supabase
      .from("roadmap_weeks")
      .update({ status: "active", unlocked_at: now })
      .eq("id", nextWeekRow.id)
      .eq("user_id", userId);
  }

  return {
    completedWeekTitle: week.title,
    completedTaskWhats,
    nextWeek:
      nextWeekRow && nextPhaseRow
        ? {
            id: nextWeekRow.id,
            phaseId: nextWeekRow.phase_id,
            weekNumber: nextWeekRow.week_number,
            title: nextWeekRow.title,
            objective: nextWeekRow.objective,
            phaseTitle: nextPhaseRow.title,
            phaseDescription: nextPhaseRow.description ?? "",
          }
        : null,
  };
}
