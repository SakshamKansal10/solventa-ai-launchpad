import { createServerFn } from "@tanstack/react-start";

import { requireUser } from "@/lib/supabase/server";
import type { FounderAnalysis, FounderDNA } from "@/lib/ai/schemas";
import type { NormalizedProfile } from "@/lib/profile/normalize";
import { computeFounderGenome, computeFounderPersona } from "@/lib/profile/founder-genome";

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

interface CurrentWeekSummary {
  title: string;
  objective: string;
}

export const getDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase, user } = await requireUser();

  const [profileRes, opportunitiesRes, dnaRes, activeRoadmapRes] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
    // Every opportunity the founder has ever had, across every
    // consultation they've ever completed — deliberately unscoped here.
    // `latestOpportunities` below narrows to the current consultation for
    // the PASSIVE fallback path; an explicit `selected` status or a real
    // active roadmap (both real founder actions) are honored regardless
    // of which consultation produced them — see the primary/alternatives
    // derivation below for why the two cases are handled differently.
    supabase
      .from("opportunities")
      .select("*")
      .eq("user_id", user.id)
      .order("fit_score", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("business_dna")
      .select("id, founder_analysis, normalized_signals")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // The single source of truth for "the founder's current path" — NOT
    // "whichever active opportunity has the highest fit_score". Explore
    // More Opportunities can add a new opportunity that outscores the
    // current one without activating its roadmap (deliberately — exploring
    // more must never silently switch what the founder is already on), so
    // picking primary by score alone would show that new idea on the
    // dashboard while the roadmap page kept showing the real current one.
    supabase
      .from("roadmaps")
      .select("opportunity_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  if (opportunitiesRes.error) throw new Error(opportunitiesRes.error.message);

  const opportunities = opportunitiesRes.data ?? [];
  const latestBusinessDnaId = dnaRes.data?.id ?? null;
  // The passive fallback (no explicit selection, no active roadmap yet)
  // must only ever consider the MOST RECENT consultation's ideas — without
  // this, a founder who redoes onboarding with new answers would keep
  // seeing an old idea from a previous consultation just because it
  // happened to score higher, since old opportunities are never deleted
  // or touched by completing a new consultation (see profile.ts).
  const latestOpportunities = latestBusinessDnaId
    ? opportunities.filter((o) => o.business_dna_id === latestBusinessDnaId)
    : [];
  const activeLatest = latestOpportunities.filter((o) => o.status === "active");
  // An explicit `selected` status is real founder intent and wins
  // regardless of which consultation it came from — a founder switching
  // back to an old idea via history should never be silently overridden
  // by a newer, never-acted-on consultation.
  const selected = opportunities.find((o) => o.status === "selected") ?? null;
  const saved = opportunities.filter((o) => o.status === "saved");

  const activeRoadmapOpportunityId = activeRoadmapRes.data?.opportunity_id ?? null;
  const activeRoadmapOpportunity = activeRoadmapOpportunityId
    ? (opportunities.find((o) => o.id === activeRoadmapOpportunityId) ?? null)
    : null;
  const primary = selected ?? activeRoadmapOpportunity ?? activeLatest[0] ?? null;
  const alternatives = activeLatest.filter((o) => o.id !== primary?.id).slice(0, 2);

  let roadmap: {
    phases: RoadmapPhaseSummary[];
    nextTask: NextTask | null;
    currentWeek: CurrentWeekSummary | null;
  } | null = null;

  if (primary) {
    const roadmapRes = await supabase
      .from("roadmaps")
      .select(
        "id, roadmap_phases(key, title, order_index, roadmap_weeks(title, objective, status), roadmap_tasks(what, why, status, time_estimate, deadline, order_index))",
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
          roadmap_weeks: { title: string; objective: string; status: string }[];
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

      // Empty for a roadmap generated before the week-unlock migration —
      // the dashboard's weekly mission card simply doesn't render then.
      const activeWeek = sortedPhases
        .flatMap((p) => p.roadmap_weeks)
        .find((w) => w.status === "active");

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
        currentWeek: activeWeek
          ? { title: activeWeek.title, objective: activeWeek.objective }
          : null,
      };
    }
  }

  const genomeSource = dnaRes.data?.normalized_signals
    ? (dnaRes.data.normalized_signals as unknown as NormalizedProfile)
    : null;

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
    // Deterministic, computed fresh from stored signals every time —
    // never persisted, never drifts out of sync with the real profile.
    // Guarded on normalized_signals specifically (not just the row
    // existing) — a pre-normalization-schema row could theoretically
    // have a null/missing signals blob, and that must degrade to no
    // genome shown, never a crashed dashboard.
    genome: genomeSource ? computeFounderGenome(genomeSource) : null,
    persona: genomeSource
      ? computeFounderPersona(genomeSource, computeFounderGenome(genomeSource))
      : null,
    roadmap,
  };
});

export interface ConsultationHistoryEntry {
  businessDnaId: string;
  createdAt: string;
  opportunities: {
    id: string;
    title: string;
    oneLiner: string;
    fitScore: number;
    status: string;
  }[];
}

/** Every consultation EXCEPT the current one — completing a new
 * consultation never deletes or hides old ideas, it just stops them from
 * being the default dashboard view (see getDashboard). This is what lets
 * a founder browse and, from an opportunity's own page, explicitly switch
 * back to an old idea (getOpportunity/switchSelectedOpportunity already
 * work by opportunity id regardless of which consultation produced it). */
/** Everything the Settings page needs, gathered in one call: identity,
 * current founder status, and counts — never raw enough data to need its
 * own separate loading states per section. */
export const getSettingsData = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase, user } = await requireUser();

  const [profileRes, dnaRes, opportunitiesCountRes, roadmapCountRes, activeRoadmapRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, email, created_at")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("business_dna")
        .select("normalized_signals")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("opportunities")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase.from("roadmaps").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      // Distinct from roadmapCount above: a founder can have built and then
      // archived several roadmaps by switching ideas — the nav lock state
      // must reflect whether one is CURRENTLY active, not how many ever
      // existed.
      supabase
        .from("roadmaps")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle(),
    ]);

  const signals = dnaRes.data?.normalized_signals as unknown as NormalizedProfile | undefined;

  return {
    fullName: profileRes.data?.full_name ?? null,
    email: profileRes.data?.email ?? user.email ?? null,
    memberSince: profileRes.data?.created_at ?? null,
    currentStatus: signals?.identity.currentStatus ?? null,
    ideaCount: opportunitiesCountRes.count ?? 0,
    roadmapCount: roadmapCountRes.count ?? 0,
    hasActiveRoadmap: Boolean(activeRoadmapRes.data),
  };
});

export const getConsultationHistory = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase, user } = await requireUser();

  const [dnaRes, latestDnaRes, opportunitiesRes] = await Promise.all([
    supabase
      .from("business_dna")
      .select("id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("business_dna")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("opportunities")
      .select("id, business_dna_id, title, one_liner, fit_score, status")
      .eq("user_id", user.id)
      .order("fit_score", { ascending: false }),
  ]);
  if (dnaRes.error) throw new Error(dnaRes.error.message);
  if (opportunitiesRes.error) throw new Error(opportunitiesRes.error.message);

  const latestId = latestDnaRes.data?.id ?? null;
  const opportunities = opportunitiesRes.data ?? [];

  const history: ConsultationHistoryEntry[] = (dnaRes.data ?? [])
    .filter((dna) => dna.id !== latestId)
    .map((dna) => ({
      businessDnaId: dna.id,
      createdAt: dna.created_at,
      opportunities: opportunities
        .filter((o) => o.business_dna_id === dna.id)
        .map((o) => ({
          id: o.id,
          title: o.title,
          oneLiner: o.one_liner,
          fitScore: o.fit_score,
          status: o.status,
        })),
    }))
    .filter((entry) => entry.opportunities.length > 0);

  return history;
});
