import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireUser } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { NormalizedProfile } from "@/lib/profile/normalize";
import {
  replanRoadmap as replanRoadmapPlan,
  type ReplanBlockerReason,
} from "@/lib/ai/prompts/roadmap-adjustment";
import { persistRoadmapPlan } from "@/lib/actions/roadmap-persistence.server";

export interface RoadmapPhaseWithTasks {
  id: string;
  roadmap_id: string;
  order_index: number;
  key: string;
  title: string;
  description: string | null;
  roadmap_tasks: {
    id: string;
    phase_id: string;
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
  }[];
}

export const getRoadmap = createServerFn({ method: "GET" })
  .validator(z.object({ opportunityId: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser();

    let query = supabase
      .from("roadmaps")
      .select("*, opportunities(title, one_liner)")
      .eq("user_id", user.id)
      .eq("status", "active");
    if (data.opportunityId) query = query.eq("opportunity_id", data.opportunityId);
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
      .select("*, roadmap_tasks(*)")
      .eq("roadmap_id", roadmap.id)
      .order("order_index");
    if (phasesError) throw new Error(phasesError.message);

    return {
      roadmap,
      opportunity,
      phases: phases as unknown as RoadmapPhaseWithTasks[],
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
    const { error } = await supabase
      .from("roadmap_tasks")
      .update({ status: data.status, blocked_reason: data.blockedReason ?? null })
      .eq("id", data.taskId)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
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

    const maxOrder = Math.max(0, ...phases.map((p) => p.order_index));
    await persistRoadmapPlan(supabase, user.id, data.roadmapId, plan, maxOrder + 1, new Date());

    return { ok: true };
  });
