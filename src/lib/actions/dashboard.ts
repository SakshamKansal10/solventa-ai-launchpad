import { createServerFn } from "@tanstack/react-start";

import { requireUser } from "@/lib/supabase/server";
import type { FounderAnalysis, FounderDNA } from "@/lib/ai/schemas";
import type { NormalizedProfile } from "@/lib/profile/normalize";

interface RoadmapPhaseSummary {
  key: string;
  title: string;
  orderIndex: number;
  totalTasks: number;
  doneTasks: number;
  isCurrent: boolean;
  isDone: boolean;
}

interface NextTask {
  what: string;
  why: string;
  timeEstimate: string | null;
  deadline: string | null;
}

export const getDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase, user } = await requireUser();

  const [profileRes, opportunitiesRes, dnaRes] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
    // Tie-break by created_at ascending: completeConsultation inserts
    // opportunities in the same stable-sorted order it used to decide
    // which one's roadmap became "active" (see profile.ts), so the
    // earliest-created among equal fit scores is the one whose roadmap
    // actually exists as active — without this second key, Postgres's
    // ORDER BY has no guaranteed tie order, and a fit-score tie could
    // make `primary` (active[0], below) disagree with which roadmap the
    // roadmap page finds, even though nothing about the data is wrong.
    supabase
      .from("opportunities")
      .select("*")
      .eq("user_id", user.id)
      .order("fit_score", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("business_dna")
      .select("founder_analysis, normalized_signals")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (opportunitiesRes.error) throw new Error(opportunitiesRes.error.message);

  const opportunities = opportunitiesRes.data ?? [];
  const active = opportunities.filter((o) => o.status === "active");
  const selected = opportunities.find((o) => o.status === "selected") ?? null;
  const saved = opportunities.filter((o) => o.status === "saved");

  // The one-call architecture pre-builds a roadmap for every initial
  // opportunity, marking only the deterministic top scorer's roadmap
  // 'active' — so there's a live roadmap to show even before the founder
  // has explicitly selected anything, not only after.
  const primary = selected ?? active[0] ?? null;
  const alternatives = selected ? active.slice(0, 2) : active.slice(1, 3);

  let roadmap: { phases: RoadmapPhaseSummary[]; nextTask: NextTask | null } | null = null;

  if (primary) {
    const roadmapRes = await supabase
      .from("roadmaps")
      .select(
        "id, roadmap_phases(key, title, order_index, roadmap_tasks(what, why, status, time_estimate, deadline, order_index))",
      )
      .eq("opportunity_id", primary.id)
      .eq("status", "active")
      .maybeSingle();

    const phases = (
      roadmapRes.data as unknown as {
        roadmap_phases: {
          key: string;
          title: string;
          order_index: number;
          roadmap_tasks: {
            what: string;
            why: string;
            status: string;
            time_estimate: string | null;
            deadline: string | null;
            order_index: number;
          }[];
        }[];
      } | null
    )?.roadmap_phases;

    if (phases && phases.length > 0) {
      const sortedPhases = [...phases].sort((a, b) => a.order_index - b.order_index);
      const currentPhaseIndex = sortedPhases.findIndex((p) =>
        p.roadmap_tasks.some((t) => t.status !== "done"),
      );
      const effectiveCurrentIndex =
        currentPhaseIndex === -1 ? sortedPhases.length - 1 : currentPhaseIndex;

      const phaseSummaries: RoadmapPhaseSummary[] = sortedPhases.map((p, i) => ({
        key: p.key,
        title: p.title,
        orderIndex: p.order_index,
        totalTasks: p.roadmap_tasks.length,
        doneTasks: p.roadmap_tasks.filter((t) => t.status === "done").length,
        isCurrent: i === effectiveCurrentIndex,
        isDone: p.roadmap_tasks.length > 0 && p.roadmap_tasks.every((t) => t.status === "done"),
      }));

      const currentPhase = sortedPhases[effectiveCurrentIndex];
      const nextTaskRow = [...currentPhase.roadmap_tasks]
        .sort((a, b) => a.order_index - b.order_index)
        .find((t) => t.status !== "done");

      roadmap = {
        phases: phaseSummaries,
        nextTask: nextTaskRow
          ? {
              what: nextTaskRow.what,
              why: nextTaskRow.why,
              timeEstimate: nextTaskRow.time_estimate,
              deadline: nextTaskRow.deadline,
            }
          : null,
      };
    }
  }

  return {
    profile: profileRes.data ?? null,
    hasBusinessDna: opportunities.length > 0,
    primary,
    alternatives,
    selected,
    saved,
    businessDna: dnaRes.data
      ? {
          analysis: dnaRes.data.founder_analysis as unknown as FounderDNA | FounderAnalysis | null,
          signals: dnaRes.data.normalized_signals as unknown as NormalizedProfile,
        }
      : null,
    roadmap,
  };
});
