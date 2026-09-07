import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireUser } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { NormalizedProfile } from "@/lib/profile/normalize";
import type { OpportunityPackage } from "@/lib/ai/schemas";
import {
  replanRoadmap as replanRoadmapPlan,
  type ReplanBlockerReason,
} from "@/lib/ai/prompts/roadmap-adjustment";
import { generateWeekDetail } from "@/lib/ai/prompts/roadmap-generation";
import {
  persistRoadmapPlan,
  persistWeekDetail,
  unlockNextWeek,
} from "@/lib/actions/roadmap-persistence.server";

export interface RoadmapTaskRow {
  id: string;
  phase_id: string;
  week_id: string | null;
  order_index: number;
  what: string;
  why: string;
  how: string;
  resource: string | null;
  time_estimate: string | null;
  deadline: string | null;
  deadline_days_from_start: number;
  required: boolean;
  depends_on: string | null;
  done_when: string;
  status: "pending" | "in_progress" | "done" | "blocked";
  blocked_reason: string | null;
}

export interface RoadmapWeekWithTasks {
  id: string;
  phase_id: string;
  order_index: number;
  week_number: number;
  title: string;
  objective: string;
  status: "locked" | "active" | "completed";
  unlocked_at: string | null;
  /** Null until this week's detail is actually generated (just-in-time,
   * on unlock) — an active week with null mission and zero tasks is the
   * "still generating / needs retry" state the roadmap page detects. */
  mission: string | null;
  mistakes_to_avoid: string[] | null;
  evidence_required: string | null;
  success_threshold: string | null;
  founder_reflection: string | null;
  completed_at: string | null;
  roadmap_tasks: RoadmapTaskRow[];
}

export interface RoadmapPhaseWithTasks {
  id: string;
  roadmap_id: string;
  order_index: number;
  key: string;
  title: string;
  description: string | null;
  // Populated for every roadmap generated after the week-unlock migration.
  // Empty for older roadmaps generated before it — the UI falls back to
  // rendering `roadmap_tasks` directly under the phase in that case,
  // exactly as it always has.
  roadmap_weeks: RoadmapWeekWithTasks[];
  roadmap_tasks: RoadmapTaskRow[];
}

export const getRoadmap = createServerFn({ method: "GET" })
  .validator(z.object({ opportunityId: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser();

    // With no opportunityId, "the roadmap" means the current active one.
    // With a specific opportunityId, the caller wants THAT opportunity's
    // roadmap regardless of status — alternatives' roadmaps are
    // "available", not "active", and filtering to active-only here would
    // make an alternative's own roadmap unreachable even though it's
    // already fully built and sitting in the database.
    let query = supabase
      .from("roadmaps")
      .select("*, opportunities(title, one_liner)")
      .eq("user_id", user.id);
    query = data.opportunityId
      ? query.eq("opportunity_id", data.opportunityId)
      : query.eq("status", "active");
    const { data: roadmapRow, error } = await query
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!roadmapRow) return null;

    const { opportunities, ...roadmap } =
      roadmapRow as unknown as Database["public"]["Tables"]["roadmaps"]["Row"] & {
        opportunities: { title: string; one_liner: string } | null;
      };
    const opportunity = opportunities;

    const { data: phases, error: phasesError } = await supabase
      .from("roadmap_phases")
      .select("*, roadmap_weeks(*, roadmap_tasks(*)), roadmap_tasks(*)")
      .eq("roadmap_id", roadmap.id)
      .order("order_index");
    if (phasesError) throw new Error(phasesError.message);

    // Read-only — a compact founder summary for the roadmap header's "built
    // around your Xh/week and ₹Y capital" line. Never used to generate or
    // recompute anything, just to display real, already-stored numbers
    // instead of a generic subtitle.
    const dnaRow = await supabase
      .from("business_dna")
      .select("normalized_signals")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const signals = dnaRow.data?.normalized_signals as unknown as NormalizedProfile | undefined;
    const founderSummary = signals
      ? {
          weeklyHours: signals.time.weeklyHours,
          capitalAmount: signals.resources.capitalAmount,
          currency: signals.identity.currency,
        }
      : null;

    return {
      roadmap,
      opportunity,
      phases: phases as unknown as RoadmapPhaseWithTasks[],
      founderSummary,
    };
  });

export const updateTaskStatus = createServerFn({ method: "POST" })
  .validator(
    z.object({
      taskId: z.string().uuid(),
      status: z.enum(["pending", "in_progress", "done", "blocked"]),
      blockedReason: z.string().optional(),
      /** Only meaningful when this task turns out to be the last one in
       * its week — the founder's own short note on how the week went,
       * which genuinely shapes what Sol generates for the next week
       * (see generateWeekDetail). Always optional; a founder should never
       * be blocked from finishing a task just to write a reflection. */
      weekReflection: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser();
    const { data: taskRow, error } = await supabase
      .from("roadmap_tasks")
      .update({ status: data.status, blocked_reason: data.blockedReason ?? null })
      .eq("id", data.taskId)
      .eq("user_id", user.id)
      .select("week_id, phase_id")
      .single();
    if (error) throw new Error(error.message);

    // Marking the last remaining task in a week done unlocks the next one
    // — and, if that next week has no detail yet (the normal JIT case),
    // generates it right now using what actually happened this week as
    // context. A generation failure here must never lose the founder's
    // real progress: the task status update above has already committed,
    // and the newly-unlocked week simply stays active with no tasks yet
    // — the roadmap page detects that and offers a retry (see
    // generateActiveWeekDetail below). Never locks anything back —
    // un-marking a task is a correction, not a reason to re-lock progress
    // the founder already made.
    if (data.status === "done" && taskRow?.week_id) {
      const { data: siblings, error: siblingsError } = await supabase
        .from("roadmap_tasks")
        .select("status")
        .eq("week_id", taskRow.week_id);
      if (siblingsError) throw new Error(siblingsError.message);
      if ((siblings ?? []).every((t) => t.status === "done")) {
        const result = await unlockNextWeek(
          supabase,
          user.id,
          taskRow.week_id,
          data.weekReflection ?? null,
        );
        // The task update and week unlock above have already committed —
        // a failure generating the NEXT week's detail must never surface
        // as if THIS task's completion failed (the client would roll back
        // its optimistic "done" state for a task that is, in the
        // database, genuinely done). The newly-active week simply stays
        // active with no tasks yet; the roadmap page's self-healing retry
        // (generateActiveWeekDetail) picks it up from there.
        if (result.nextWeek) {
          try {
            await generateAndPersistWeekDetail(supabase, user.id, result.nextWeek, {
              title: result.completedWeekTitle,
              completedTasks: result.completedTaskWhats,
              reflection: data.weekReflection ?? null,
            });
          } catch (err) {
            console.error("[roadmap] next-week detail generation failed after unlock:", err);
          }
        }
      }
    }

    return { ok: true };
  });

/** Shared by updateTaskStatus (automatic, on unlock) and
 * generateActiveWeekDetail (manual retry after a failed automatic
 * attempt) — generates and persists exactly one week's detail. Loads the
 * founder's profile and the roadmap's opportunity fresh each time rather
 * than threading them through, since this can be called long after the
 * roadmap was first built. */
async function generateAndPersistWeekDetail(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  week: {
    id: string;
    phaseId: string;
    weekNumber: number;
    title: string;
    objective: string;
    phaseTitle: string;
    phaseDescription: string;
  },
  priorWeek: { title: string; completedTasks: string[]; reflection: string | null } | null,
): Promise<void> {
  const { data: phaseRow, error: phaseError } = await supabase
    .from("roadmap_phases")
    .select("roadmap_id")
    .eq("id", week.phaseId)
    .single();
  if (phaseError || !phaseRow) throw new Error(phaseError?.message ?? "Roadmap phase not found");

  const { data: roadmapRow, error: roadmapError } = await supabase
    .from("roadmaps")
    .select("opportunity_id")
    .eq("id", phaseRow.roadmap_id)
    .single();
  if (roadmapError || !roadmapRow)
    throw new Error(roadmapError?.message ?? "Roadmap not found for this week");

  const { data: opportunityRow, error: oppError } = await supabase
    .from("opportunities")
    .select("candidate, business_dna_id")
    .eq("id", roadmapRow.opportunity_id)
    .single();
  if (oppError || !opportunityRow) throw new Error(oppError?.message ?? "Opportunity not found");

  const { data: dnaRow, error: dnaError } = await supabase
    .from("business_dna")
    .select("normalized_signals")
    .eq("id", opportunityRow.business_dna_id)
    .single();
  if (dnaError || !dnaRow) throw new Error(dnaError?.message ?? "Business DNA not found");

  const profile = dnaRow.normalized_signals as unknown as NormalizedProfile;
  const opportunity = opportunityRow.candidate as unknown as OpportunityPackage;

  const detail = await generateWeekDetail(profile, opportunity, {
    phaseTitle: week.phaseTitle,
    phaseDescription: week.phaseDescription,
    weekTitle: week.title,
    weekObjective: week.objective,
    weekNumber: week.weekNumber,
    priorWeek,
  });

  await persistWeekDetail(supabase, userId, week.id, week.phaseId, detail, new Date());
}

/** Manual retry for the one real failure mode in this architecture: a
 * week unlocked (via Build My Roadmap or finishing the prior week) but
 * its detail generation failed, leaving it active with zero tasks. The
 * roadmap page calls this when it renders exactly that state. No-op
 * (returns immediately) if the week already has tasks, so a duplicate
 * click can never generate two conflicting sets of tasks for one week. */
export const generateActiveWeekDetail = createServerFn({ method: "POST" })
  .validator(z.object({ weekId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser();

    const { data: weekRaw, error } = await supabase
      .from("roadmap_weeks")
      .select("id, phase_id, week_number, title, objective, status, roadmap_tasks(id)")
      .eq("id", data.weekId)
      .eq("user_id", user.id)
      .single();
    if (error || !weekRaw) throw new Error(error?.message ?? "Roadmap week not found");
    const week = weekRaw as unknown as {
      id: string;
      phase_id: string;
      week_number: number;
      title: string;
      objective: string;
      status: string;
      roadmap_tasks: { id: string }[];
    };
    if (week.status !== "active") throw new Error("Only the active week can be generated.");
    if (week.roadmap_tasks.length > 0) return { ok: true, alreadyGenerated: true };

    const { data: phase, error: phaseError } = await supabase
      .from("roadmap_phases")
      .select("title, description")
      .eq("id", week.phase_id)
      .single();
    if (phaseError || !phase) throw new Error(phaseError?.message ?? "Roadmap phase not found");

    // A retry after failure has no "prior week" context beyond what's
    // already stored (the previous week's own founder_reflection, if the
    // founder gave one) — best-effort, not required for the retry to work.
    const { data: prevWeekRaw } = await supabase
      .from("roadmap_weeks")
      .select("title, founder_reflection, roadmap_tasks(what, status)")
      .eq("phase_id", week.phase_id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const prevWeek = prevWeekRaw as unknown as {
      title: string;
      founder_reflection: string | null;
      roadmap_tasks: { what: string; status: string }[];
    } | null;

    await generateAndPersistWeekDetail(
      supabase,
      user.id,
      {
        id: week.id,
        phaseId: week.phase_id,
        weekNumber: week.week_number,
        title: week.title,
        objective: week.objective,
        phaseTitle: phase.title,
        phaseDescription: phase.description ?? "",
      },
      prevWeek
        ? {
            title: prevWeek.title,
            completedTasks: prevWeek.roadmap_tasks
              .filter((t) => t.status === "done")
              .map((t) => t.what),
            reflection: prevWeek.founder_reflection,
          }
        : null,
    );

    return { ok: true, alreadyGenerated: false };
  });

export const replanRoadmap = createServerFn({ method: "POST" })
  .validator(
    z.object({
      roadmapId: z.string().uuid(),
      blockerReason: z.enum([
        "time",
        "money",
        "difficulty",
        "confusion",
        "motivation",
        "access",
        "other",
      ]),
      blockerNote: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser();

    const { data: roadmap, error } = await supabase
      .from("roadmaps")
      .select("*, opportunities(title), roadmap_phases(*, roadmap_tasks(*))")
      .eq("id", data.roadmapId)
      .eq("user_id", user.id)
      .single();
    if (error || !roadmap) throw new Error(error?.message ?? "Roadmap not found");

    const opportunity = (roadmap as unknown as { opportunities: { title: string } }).opportunities;
    const phases = (
      roadmap as unknown as {
        roadmap_phases: {
          order_index: number;
          roadmap_tasks: { what: string; status: string }[];
        }[];
      }
    ).roadmap_phases;

    const allTasks = phases.flatMap((p) => p.roadmap_tasks);
    const completed = allTasks.filter((t) => t.status === "done");
    const remaining = allTasks.filter((t) => t.status !== "done");

    const dnaRow = await supabase
      .from("business_dna")
      .select("normalized_signals")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (dnaRow.error || !dnaRow.data) throw new Error("Business DNA not found");
    const profile = dnaRow.data.normalized_signals as unknown as NormalizedProfile;

    const plan = await replanRoadmapPlan(profile, {
      opportunityTitle: opportunity.title,
      completedSummary: completed.map((t) => t.what).join("; "),
      remainingTasksSummary: remaining.map((t) => t.what).join("; "),
      blockerReason: data.blockerReason as ReplanBlockerReason,
      blockerNote: data.blockerNote ?? "",
    });

    const remainingTaskIds = remaining
      .map((t) => (t as unknown as { id?: string }).id)
      .filter(Boolean);
    if (remainingTaskIds.length > 0) {
      await supabase
        .from("roadmap_tasks")
        .delete()
        .in("id", remainingTaskIds as string[]);
    }
    // A phase becomes empty once its remaining (non-done) tasks are deleted
    // above — that's every phase with zero completed tasks, not (per the
    // stale pre-deletion list) phases with zero tasks total.
    const emptyPhases = phases
      .filter((p) => p.roadmap_tasks.every((t) => t.status !== "done"))
      .map((p) => (p as unknown as { id?: string }).id)
      .filter(Boolean);
    if (emptyPhases.length > 0) {
      await supabase
        .from("roadmap_phases")
        .delete()
        .in("id", emptyPhases as string[]);
    }

    // A phase can survive (it still has done tasks in some other week)
    // while one specific week inside it was fully cleared above — that
    // week would otherwise be left behind as an empty, orphaned row.
    const survivingPhaseIds = phases
      .map((p) => (p as unknown as { id?: string }).id)
      .filter((id): id is string => Boolean(id) && !emptyPhases.includes(id));
    if (survivingPhaseIds.length > 0) {
      const { data: remainingWeeksData } = await supabase
        .from("roadmap_weeks")
        .select("id, roadmap_tasks(id)")
        .in("phase_id", survivingPhaseIds);
      const remainingWeeks = (remainingWeeksData ?? []) as unknown as {
        id: string;
        roadmap_tasks: { id: string }[];
      }[];
      const orphanedWeekIds = remainingWeeks
        .filter((w) => (w.roadmap_tasks ?? []).length === 0)
        .map((w) => w.id);
      if (orphanedWeekIds.length > 0) {
        await supabase.from("roadmap_weeks").delete().in("id", orphanedWeekIds);
      }
    }

    const maxOrder = Math.max(0, ...phases.map((p) => p.order_index));
    await persistRoadmapPlan(supabase, user.id, data.roadmapId, plan, maxOrder + 1, new Date());

    return { ok: true };
  });
