import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireUser } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { NormalizedProfile } from "@/lib/profile/normalize";
import {
  replanRoadmap as replanRoadmapPlan,
  type ReplanBlockerReason,
} from "@/lib/ai/prompts/roadmap-adjustment";
import { persistRoadmapPlan, unlockNextWeek } from "@/lib/actions/roadmap-persistence.server";

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
    }),
  )
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser();
    const { data: taskRow, error } = await supabase
      .from("roadmap_tasks")
      .update({ status: data.status, blocked_reason: data.blockedReason ?? null })
      .eq("id", data.taskId)
      .eq("user_id", user.id)
      .select("week_id")
      .single();
    if (error) throw new Error(error.message);

    // Marking the last remaining task in a week done unlocks the next one.
    // Never locks anything back — un-marking a task is a correction, not a
    // reason to re-lock progress the founder already made.
    if (data.status === "done" && taskRow?.week_id) {
      const { data: siblings, error: siblingsError } = await supabase
        .from("roadmap_tasks")
        .select("status")
        .eq("week_id", taskRow.week_id);
      if (siblingsError) throw new Error(siblingsError.message);
      if ((siblings ?? []).every((t) => t.status === "done")) {
        await unlockNextWeek(supabase, user.id, taskRow.week_id);
      }
    }

    return { ok: true };
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
