import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import type { RoadmapPlan } from "@/lib/ai/schemas";
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

/** Called after a task is marked done, when it turns out to have been the
 * last remaining task in its week: marks that week completed and unlocks
 * whatever comes next (the next week in the same phase, or if none, the
 * first week of the next phase). No-op if there's nothing left to unlock
 * (the founder just finished the roadmap's last week). Never locks
 * anything back — unlocking is one-directional. */
export async function unlockNextWeek(
  supabase: SupabaseClient<Database>,
  userId: string,
  weekId: string,
): Promise<void> {
  const now = new Date().toISOString();

  const { data: week, error } = await supabase
    .from("roadmap_weeks")
    .select("id, phase_id, order_index")
    .eq("id", weekId)
    .single();
  if (error || !week) throw new Error(error?.message ?? "Roadmap week not found");

  await supabase
    .from("roadmap_weeks")
    .update({ status: "completed", completed_at: now })
    .eq("id", weekId)
    .eq("user_id", userId);

  const { data: nextInPhase } = await supabase
    .from("roadmap_weeks")
    .select("id")
    .eq("phase_id", week.phase_id)
    .eq("order_index", week.order_index + 1)
    .maybeSingle();

  let nextWeekId = nextInPhase?.id ?? null;

  if (!nextWeekId) {
    const { data: phase } = await supabase
      .from("roadmap_phases")
      .select("roadmap_id, order_index")
      .eq("id", week.phase_id)
      .single();

    if (phase) {
      const { data: nextPhase } = await supabase
        .from("roadmap_phases")
        .select("id")
        .eq("roadmap_id", phase.roadmap_id)
        .eq("order_index", phase.order_index + 1)
        .maybeSingle();

      if (nextPhase) {
        const { data: firstWeekOfNextPhase } = await supabase
          .from("roadmap_weeks")
          .select("id")
          .eq("phase_id", nextPhase.id)
          .order("order_index", { ascending: true })
          .limit(1)
          .maybeSingle();
        nextWeekId = firstWeekOfNextPhase?.id ?? null;
      }
    }
  }

  if (nextWeekId) {
    await supabase
      .from("roadmap_weeks")
      .update({ status: "active", unlocked_at: now })
      .eq("id", nextWeekId)
      .eq("user_id", userId);
  }
}
