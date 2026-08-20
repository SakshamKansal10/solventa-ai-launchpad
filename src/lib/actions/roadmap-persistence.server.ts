import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import type { RoadmapPlan } from "@/lib/ai/schemas";
import { MODEL } from "@/lib/ai/gemini.server";

function computeDeadline(referenceDate: Date, daysFromStart: number): string {
  return new Date(referenceDate.getTime() + daysFromStart * 86_400_000).toISOString().slice(0, 10);
}

/** Inserts phases/tasks for a roadmap plan, computing each task's absolute
 * deadline deterministically from `referenceDate` (never AI-guessed — see
 * item 19). The raw relative offset is stored too, so a roadmap that was
 * pre-generated before being selected can have its dates recalculated from
 * whenever it actually starts (see reactivateRoadmap below). */
export async function persistRoadmapPlan(
  supabase: SupabaseClient<Database>,
  userId: string,
  roadmapId: string,
  plan: RoadmapPlan,
  startPhaseIndex: number,
  referenceDate: Date,
): Promise<void> {
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

    const taskRows = phase.tasks.map((task, taskIndex) => ({
      phase_id: phaseRow.id,
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

/** Creates a roadmap row + its full phase/task tree for one opportunity —
 * used both by the one-call initial generation (3 roadmaps at once, only
 * one 'active') and by "Explore More" (each newly explored opportunity
 * gets its own roadmap immediately, same as the original 3). */
export async function createRoadmap(
  supabase: SupabaseClient<Database>,
  userId: string,
  opportunityId: string,
  plan: RoadmapPlan,
  status: "active" | "available",
): Promise<string> {
  const { data: roadmapRow, error } = await supabase
    .from("roadmaps")
    .insert({ user_id: userId, opportunity_id: opportunityId, status, ai_model: MODEL })
    .select("id")
    .single();
  if (error || !roadmapRow) throw new Error(error?.message ?? "Failed to create roadmap");

  await persistRoadmapPlan(supabase, userId, roadmapRow.id, plan, 0, new Date());
  return roadmapRow.id;
}

/** Switching to an opportunity whose roadmap already exists (pre-generated
 * or previously archived) needs zero Gemini calls — just recompute
 * deadlines for its not-yet-done tasks relative to right now, since "day
 * 3" should mean day 3 of actually starting, not day 3 of silent
 * pre-generation, then flip it to active. Completed tasks keep their real
 * history untouched. */
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
    .update({ status: "active" })
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
