import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireUser } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { notifyFounder } from "@/lib/actions/notifications";
import { notificationLinks } from "@/lib/notification-links";
import { sendRoadmapReadyEmail } from "@/lib/actions/email.server";
import {
  archiveActiveRoadmapsExcept,
  reactivateRoadmap,
  selectOpportunityRow,
  setActivePointer,
} from "@/lib/actions/direction.server";
import {
  createBuildingRoadmap,
  findRoadmapForOpportunity,
  generateRoadmapSkeleton,
  generateWeekOnce,
  loadGenerationInputs,
  persistSkeleton,
  summarizeEvidenceForPrompt,
  type PriorWeekInput,
  type WeekContext,
} from "@/lib/actions/roadmap-lifecycle.server";
import { getSchemaCapabilities } from "@/lib/schema-capabilities.server";
import { canCloseWeek, globalWeekNumbers, missionStateToDb } from "@/lib/roadmap/state";
import {
  buildRoadmapView,
  type EvidenceRef,
  type RawPhase,
  type RawRoadmap,
  type RoadmapView,
} from "@/lib/roadmap/view";

export type { RoadmapView, WeekDTO, MissionDTO, PhaseDTO } from "@/lib/roadmap/view";

type Db = SupabaseClient<Database>;

const OUTCOME_LABEL: Record<string, string> = {
  stronger: "Stronger than expected",
  as_expected: "About as expected",
  weaker: "Weaker than expected",
  mixed: "Mixed",
};

/** ---- read ---------------------------------------------------------------------- */

export async function loadRoadmapView(
  db: Db,
  userId: string,
  roadmapId: string,
): Promise<RoadmapView | null> {
  const caps = await getSchemaCapabilities(db);
  const [roadmapRes, phasesRes] = await Promise.all([
    db
      .from("roadmaps")
      .select("*, opportunities(title)")
      .eq("id", roadmapId)
      .eq("user_id", userId)
      .maybeSingle(),
    db
      .from("roadmap_phases")
      .select("*, roadmap_weeks(*, roadmap_tasks(*))")
      .eq("roadmap_id", roadmapId)
      .eq("user_id", userId)
      .order("order_index"),
  ]);
  if (roadmapRes.error) throw new Error(roadmapRes.error.message);
  if (phasesRes.error) throw new Error(phasesRes.error.message);
  if (!roadmapRes.data) return null;

  const { opportunities, ...roadmap } = roadmapRes.data as unknown as RawRoadmap & {
    opportunities: { title: string } | null;
  };

  let evidence: EvidenceRef[] = [];
  if (caps.proof) {
    const { data } = await db
      .from("proof_evidence")
      .select("week_id, task_id")
      .eq("opportunity_id", roadmap.opportunity_id)
      .eq("user_id", userId);
    evidence = data ?? [];
  }

  return buildRoadmapView({
    roadmap,
    opportunityTitle: opportunities?.title ?? "",
    phases: (phasesRes.data ?? []) as unknown as RawPhase[],
    evidence,
  });
}

export const getRoadmapView = createServerFn({ method: "GET" })
  .validator(z.object({ roadmapId: z.string().uuid() }))
  .handler(async ({ data }): Promise<RoadmapView | null> => {
    const { supabase, user } = await requireUser();
    return loadRoadmapView(supabase, user.id, data.roadmapId);
  });

/** ---- missions -------------------------------------------------------------------- */

export const setMissionState = createServerFn({ method: "POST" })
  .validator(
    z.object({
      taskId: z.string().uuid(),
      state: z.enum(["not_started", "in_progress", "completed"]),
    }),
  )
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser();
    const caps = await getSchemaCapabilities(supabase);
    // A mission that asks for evidence cannot be marked done without any: the
    // evidence is the point of the mission, not a formality after it.
    if (data.state === "completed" && caps.proof) {
      const { data: task } = await supabase
        .from("roadmap_tasks")
        .select("evidence_required")
        .eq("id", data.taskId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (task?.evidence_required) {
        const { count } = await supabase
          .from("proof_evidence")
          .select("id", { count: "exact", head: true })
          .eq("task_id", data.taskId)
          .eq("user_id", user.id);
        if (!count) throw new Error("EVIDENCE_REQUIRED");
      }
    }
    const now = new Date().toISOString();
    const patch: Database["public"]["Tables"]["roadmap_tasks"]["Update"] = {
      status: missionStateToDb(data.state),
      blocked_reason: null,
      updated_at: now,
    };
    if (caps.weekLock) {
      patch.completed_at = data.state === "completed" ? now : null;
      if (data.state === "in_progress") patch.started_at = now;
      if (data.state === "not_started") patch.started_at = null;
    }
    const { data: rows, error } = await supabase
      .from("roadmap_tasks")
      .update(patch)
      .eq("id", data.taskId)
      .eq("user_id", user.id)
      .select("id, week_id");
    if (error) throw new Error(error.message);
    if ((rows ?? []).length === 0) throw new Error("Mission not found");
    return { ok: true as const };
  });

/** ---- closing a week + preparing the next ------------------------------------------- */

const closeInput = z.object({
  weekId: z.string().uuid(),
  outcome: z.enum(["stronger", "as_expected", "weaker", "mixed"]).optional(),
  blocker: z.string().trim().max(60).optional(),
  note: z.string().trim().max(600).optional(),
  locale: z.enum(["en", "hi"]).optional(),
});

interface OrderedWeek {
  id: string;
  phaseId: string;
  number: number;
  title: string;
  objective: string;
  status: "locked" | "active" | "completed";
  phaseTitle: string;
  phaseDescription: string;
  reflectionOutcome: string | null;
  reflectionBlocker: string | null;
  reflectionNote: string | null;
  tasks: {
    what: string;
    status: "pending" | "in_progress" | "done" | "blocked";
    required: boolean;
  }[];
}

async function loadOrderedWeeks(db: Db, userId: string, roadmapId: string): Promise<OrderedWeek[]> {
  const { data, error } = await db
    .from("roadmap_phases")
    .select("*, roadmap_weeks(*, roadmap_tasks(what, status, required))")
    .eq("roadmap_id", roadmapId)
    .eq("user_id", userId)
    .order("order_index");
  if (error) throw new Error(error.message);
  const phases = (data ??
    []) as unknown as (Database["public"]["Tables"]["roadmap_phases"]["Row"] & {
    roadmap_weeks: (Database["public"]["Tables"]["roadmap_weeks"]["Row"] & {
      roadmap_tasks: OrderedWeek["tasks"];
    })[];
  })[];
  const numbers = globalWeekNumbers(phases);
  const out: OrderedWeek[] = [];
  for (const p of phases) {
    for (const w of [...p.roadmap_weeks].sort((a, b) => a.order_index - b.order_index)) {
      out.push({
        id: w.id,
        phaseId: p.id,
        number: numbers.get(w.id) ?? 0,
        title: w.title,
        objective: w.objective,
        status: w.status,
        phaseTitle: p.title,
        phaseDescription: p.description ?? "",
        reflectionOutcome: w.reflection_outcome ?? null,
        reflectionBlocker: w.reflection_blocker ?? null,
        reflectionNote: w.reflection_note ?? w.founder_reflection ?? null,
        tasks: w.roadmap_tasks,
      });
    }
  }
  return out.sort((a, b) => a.number - b.number);
}

function priorInput(
  week: OrderedWeek,
  evidence: { evidenceSummary: string | null; assumptionStates: string | null },
): PriorWeekInput {
  return {
    title: week.title,
    completedTasks: week.tasks.filter((t) => t.status === "done").map((t) => t.what),
    reflection: week.reflectionNote,
    outcome: (week.reflectionOutcome as PriorWeekInput["outcome"]) ?? null,
    blocker: week.reflectionBlocker,
    evidenceSummary: evidence.evidenceSummary,
    assumptionStates: evidence.assumptionStates,
  };
}

export type CloseWeekResult =
  | { result: "generated"; nextWeekId: string; nextWeekNumber: number }
  | { result: "in_progress"; nextWeekId: string; nextWeekNumber: number }
  | { result: "generation_failed"; nextWeekId: string; nextWeekNumber: number }
  | { result: "roadmap_completed" };

/**
 * "Prepare Week N+1". Safe to call any number of times, from any number of
 * tabs: closing is a guarded status transition, unlocking is a guarded
 * transition, and the next week's detail is generated at most once behind a
 * database compare-and-swap lock (see acquireWeekLock) with a unique
 * (week_id, order_index) index as the final backstop. A failure leaves the
 * closed week completed and the next week active-but-empty, retryable via
 * retryWeek — the roadmap is never corrupted.
 */
export const closeWeek = createServerFn({ method: "POST" })
  .validator(closeInput)
  .handler(async ({ data }): Promise<CloseWeekResult> => {
    const { supabase, user } = await requireUser();
    const caps = await getSchemaCapabilities(supabase);

    const { data: weekRow, error } = await supabase
      .from("roadmap_weeks")
      .select("id, phase_id, status, user_id")
      .eq("id", data.weekId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!weekRow) throw new Error("Roadmap week not found");
    const { data: phase } = await supabase
      .from("roadmap_phases")
      .select("roadmap_id")
      .eq("id", weekRow.phase_id)
      .eq("user_id", user.id)
      .single();
    if (!phase) throw new Error("Roadmap phase not found");
    const { data: roadmapRow } = await supabase
      .from("roadmaps")
      .select("id, opportunity_id, status")
      .eq("id", phase.roadmap_id)
      .eq("user_id", user.id)
      .single();
    if (!roadmapRow) throw new Error("Roadmap not found");

    const ordered = await loadOrderedWeeks(supabase, user.id, roadmapRow.id);
    const idx = ordered.findIndex((w) => w.id === data.weekId);
    const week = ordered[idx];
    if (!week) throw new Error("Roadmap week not found");
    if (week.status === "locked") throw new Error("WEEK_LOCKED");

    if (week.status === "active") {
      if (!canCloseWeek(week.tasks)) throw new Error("WEEK_NOT_READY");
      const now = new Date().toISOString();
      const reflectionText = [
        data.outcome ? OUTCOME_LABEL[data.outcome] : null,
        data.blocker ? `Blocker: ${data.blocker.replace(/_/g, " ")}` : null,
        data.note || null,
      ]
        .filter(Boolean)
        .join(". ");
      const patch: Database["public"]["Tables"]["roadmap_weeks"]["Update"] = {
        status: "completed",
        completed_at: now,
        founder_reflection: reflectionText || null,
      };
      if (caps.weekLock) {
        patch.closed_at = now;
        patch.reflection_outcome = data.outcome ?? null;
        patch.reflection_blocker = data.blocker ?? null;
        patch.reflection_note = data.note ?? null;
      }
      // Guarded on status='active': a second tab closing the same week matches
      // zero rows and simply continues with the (already recorded) close.
      const closed = await supabase
        .from("roadmap_weeks")
        .update(patch)
        .eq("id", week.id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .select("id");
      if (closed.error) throw new Error(closed.error.message);
      // Reflect what we just wrote for the prior-week prompt below.
      week.reflectionOutcome = data.outcome ?? week.reflectionOutcome;
      week.reflectionBlocker = data.blocker ?? week.reflectionBlocker;
      week.reflectionNote = data.note || reflectionText || week.reflectionNote;
    }

    const next = ordered[idx + 1];
    if (!next) {
      if (caps.roadmapStates) {
        await supabase
          .from("roadmaps")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", roadmapRow.id)
          .eq("user_id", user.id);
      }
      return { result: "roadmap_completed" };
    }

    if (next.status === "locked") {
      const unlocked = await supabase
        .from("roadmap_weeks")
        .update({ status: "active", unlocked_at: new Date().toISOString() })
        .eq("id", next.id)
        .eq("user_id", user.id)
        .eq("status", "locked")
        .select("id");
      if (!unlocked.error && (unlocked.data ?? []).length > 0) {
        void notifyFounder(supabase, user.id, {
          type: "week_unlocked",
          title: `Week ${next.number} unlocked`,
          body: `You finished "${week.title}" — ${next.title} is ready to start.`,
          link: notificationLinks.roadmapWeek(next.number),
          params: { week: next.number, title: next.title, previous: week.title },
        });
      }
    }

    const evidence = await summarizeEvidenceForPrompt(
      supabase,
      user.id,
      roadmapRow.opportunity_id,
      week.id,
    );
    const context: WeekContext = {
      id: next.id,
      phaseId: next.phaseId,
      weekNumber: next.number,
      title: next.title,
      objective: next.objective,
      phaseTitle: next.phaseTitle,
      phaseDescription: next.phaseDescription,
    };
    try {
      const outcome = await generateWeekOnce(
        supabase,
        user.id,
        roadmapRow.opportunity_id,
        context,
        priorInput(week, evidence),
        data.locale,
      );
      return {
        result: outcome === "in_progress" ? "in_progress" : "generated",
        nextWeekId: next.id,
        nextWeekNumber: next.number,
      };
    } catch {
      return { result: "generation_failed", nextWeekId: next.id, nextWeekNumber: next.number };
    }
  });

/** Retry for the one real failure mode: a week is active but its detail
 * generation failed. No-op if the week already has missions, and a concurrent
 * retry is stopped by the same lock as everything else. */
export const retryWeek = createServerFn({ method: "POST" })
  .validator(z.object({ weekId: z.string().uuid(), locale: z.enum(["en", "hi"]).optional() }))
  .handler(async ({ data }): Promise<{ result: "generated" | "already_ready" | "in_progress" }> => {
    const { supabase, user } = await requireUser();
    const { data: weekRow } = await supabase
      .from("roadmap_weeks")
      .select("id, phase_id, status")
      .eq("id", data.weekId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!weekRow) throw new Error("Roadmap week not found");
    if (weekRow.status !== "active") throw new Error("Only the active week can be generated.");
    const { data: phase } = await supabase
      .from("roadmap_phases")
      .select("roadmap_id")
      .eq("id", weekRow.phase_id)
      .single();
    if (!phase) throw new Error("Roadmap phase not found");
    const { data: roadmapRow } = await supabase
      .from("roadmaps")
      .select("opportunity_id")
      .eq("id", phase.roadmap_id)
      .eq("user_id", user.id)
      .single();
    if (!roadmapRow) throw new Error("Roadmap not found");

    const ordered = await loadOrderedWeeks(supabase, user.id, phase.roadmap_id);
    const idx = ordered.findIndex((w) => w.id === data.weekId);
    const week = ordered[idx];
    const prev = idx > 0 ? ordered[idx - 1] : null;
    const evidence = prev
      ? await summarizeEvidenceForPrompt(supabase, user.id, roadmapRow.opportunity_id, prev.id)
      : { evidenceSummary: null, assumptionStates: null };

    const result = await generateWeekOnce(
      supabase,
      user.id,
      roadmapRow.opportunity_id,
      {
        id: week.id,
        phaseId: week.phaseId,
        weekNumber: week.number,
        title: week.title,
        objective: week.objective,
        phaseTitle: week.phaseTitle,
        phaseDescription: week.phaseDescription,
      },
      prev ? priorInput(prev, evidence) : null,
      data.locale,
    );
    return { result };
  });

/** ---- building a roadmap --------------------------------------------------------------- */

export type BuildRoadmapResult =
  | { status: "ready"; roadmapId: string; week1Ready: boolean }
  | { status: "in_progress"; roadmapId: string }
  | { status: "failed"; roadmapId: string | null };

const STALE_BUILD_MS = 4 * 60 * 1000;

/**
 * "Build My Roadmap" — idempotent and resumable. The roadmap row is created
 * first (status 'building'), so a refresh, a second tab or a retry finds it.
 * Stages, each skipped if already done: skeleton (North Star + phases + week
 * skeleton) → Week 1 detail (behind the same generation lock as every other
 * week). A skeleton failure marks the roadmap 'failed' but keeps the chosen
 * direction; a Week 1 failure keeps the finished skeleton and leaves Week 1
 * retryable from the roadmap page. Nothing is ever generated twice.
 */
export const buildRoadmap = createServerFn({ method: "POST" })
  .validator(
    z.object({ opportunityId: z.string().uuid(), locale: z.enum(["en", "hi"]).optional() }),
  )
  .handler(async ({ data }): Promise<BuildRoadmapResult> => {
    const { supabase, user } = await requireUser();
    const caps = await getSchemaCapabilities(supabase);

    const { data: opp, error: oppError } = await supabase
      .from("opportunities")
      .select("id, title, status, business_dna_id")
      .eq("id", data.opportunityId)
      .eq("user_id", user.id)
      .single();
    if (oppError || !opp) throw new Error(oppError?.message ?? "Opportunity not found");

    if (opp.status !== "selected") {
      await selectOpportunityRow(supabase, user.id, opp.id);
      await setActivePointer(supabase, user.id, opp.id);
    }

    let roadmap = await findRoadmapForOpportunity(supabase, user.id, opp.id);

    // A roadmap already built: resume it (archived) or hand it back (active/done).
    if (roadmap && (roadmap.status === "archived" || roadmap.status === "available")) {
      await archiveActiveRoadmapsExcept(supabase, user.id, opp.id);
      await reactivateRoadmap(supabase, user.id, roadmap.id);
      void notifyFounder(supabase, user.id, {
        type: "roadmap_ready",
        title: "Roadmap reactivated",
        body: `Your roadmap for ${opp.title} is active again — pick up where you left off.`,
        link: notificationLinks.roadmapWeek(1),
        params: { title: opp.title, reactivated: 1 },
      });
      return { status: "ready", roadmapId: roadmap.id, week1Ready: true };
    }
    if (roadmap && (roadmap.status === "active" || roadmap.status === "completed")) {
      return { status: "ready", roadmapId: roadmap.id, week1Ready: true };
    }

    await archiveActiveRoadmapsExcept(supabase, user.id, opp.id);

    let takeover = false;
    if (!roadmap) {
      const created = await createBuildingRoadmap(supabase, user.id, opp.id, caps);
      roadmap = await findRoadmapForOpportunity(supabase, user.id, opp.id);
      if (!roadmap) throw new Error("Failed to create roadmap");
      if (!created.created) takeover = true;
    } else {
      takeover = true;
    }

    // Another request is (probably) already building this roadmap: don't start a second.
    if (takeover && roadmap.status === "building") {
      const age = Date.now() - Date.parse(roadmap.updated_at);
      if (age < STALE_BUILD_MS) return { status: "in_progress", roadmapId: roadmap.id };
    }

    // Claim (or re-claim a failed / stale build) with an optimistic lock on updated_at.
    if (takeover && caps.roadmapStates) {
      const claim = await supabase
        .from("roadmaps")
        .update({ status: "building", build_error: null, updated_at: new Date().toISOString() })
        .eq("id", roadmap.id)
        .eq("user_id", user.id)
        .eq("updated_at", roadmap.updated_at)
        .select("id");
      if (claim.error) throw new Error(claim.error.message);
      if ((claim.data ?? []).length === 0) return { status: "in_progress", roadmapId: roadmap.id };
    }

    const roadmapId = roadmap.id;
    try {
      const { count: phaseCount } = await supabase
        .from("roadmap_phases")
        .select("id", { count: "exact", head: true })
        .eq("roadmap_id", roadmapId);

      if ((phaseCount ?? 0) === 0) {
        const { profile, opportunity } = await loadGenerationInputs(supabase, user.id, opp.id);
        const skeleton = await generateRoadmapSkeleton(profile, opportunity, data.locale);
        await persistSkeleton(supabase, user.id, roadmapId, skeleton, new Date(), caps);
        await supabase
          .from("roadmaps")
          .update({ north_star: skeleton.northStar, updated_at: new Date().toISOString() })
          .eq("id", roadmapId)
          .eq("user_id", user.id);
      }
    } catch (err) {
      console.error("[roadmap] skeleton generation failed:", err);
      if (caps.roadmapStates) {
        await supabase
          .from("roadmaps")
          .update({
            status: "failed",
            build_error:
              err instanceof Error ? err.message.slice(0, 500) : "Roadmap generation failed",
          })
          .eq("id", roadmapId)
          .eq("user_id", user.id);
      } else {
        // Pre-0010 the row was created 'active': an empty active roadmap would
        // strand the founder, so remove it and let them retry cleanly.
        await supabase.from("roadmaps").delete().eq("id", roadmapId).eq("user_id", user.id);
      }
      void notifyFounder(supabase, user.id, {
        type: "roadmap_build_failed",
        title: "Your roadmap couldn't be built",
        body: `We couldn't finish building the roadmap for ${opp.title}. Your direction is saved — try again.`,
        link: notificationLinks.roadmapBuilding(opp.id),
        params: { title: opp.title },
      });
      return { status: "failed", roadmapId };
    }

    // Skeleton exists → the roadmap is real. Activate it before Week 1 so a
    // Week 1 failure never hides the finished plan.
    const { error: activateError } = await supabase
      .from("roadmaps")
      .update({
        status: "active",
        activated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", roadmapId)
      .eq("user_id", user.id);
    if (activateError) throw new Error(activateError.message);

    const ordered = await loadOrderedWeeks(supabase, user.id, roadmapId);
    const first = ordered[0];
    let week1Ready = false;
    if (first) {
      try {
        const outcome = await generateWeekOnce(
          supabase,
          user.id,
          opp.id,
          {
            id: first.id,
            phaseId: first.phaseId,
            weekNumber: first.number,
            title: first.title,
            objective: first.objective,
            phaseTitle: first.phaseTitle,
            phaseDescription: first.phaseDescription,
          },
          null,
          data.locale,
        );
        week1Ready = outcome !== "in_progress";
      } catch {
        week1Ready = false;
      }
    }

    void notifyFounder(supabase, user.id, {
      type: "roadmap_ready",
      title: "Your roadmap is ready",
      body: `${first?.title ?? "Week 1"} of your roadmap for ${opp.title} is ready to start.`,
      link: notificationLinks.roadmapWeek(1),
      params: { title: opp.title, week: 1, weekTitle: first?.title ?? "" },
    });
    if (user.email && first) {
      const fullName = (user.user_metadata?.full_name as string | undefined) ?? null;
      const { opportunity } = await loadGenerationInputs(supabase, user.id, opp.id).catch(() => ({
        opportunity: null,
      }));
      void sendRoadmapReadyEmail(user.email, fullName, {
        opportunityTitle: opp.title,
        week1Title: first.title,
        week1Objective: first.objective,
        missionCount: week1Ready ? first.tasks.length || null : null,
        weeklyTimeCommitment: opportunity?.weeklyTime ?? null,
      });
    }

    return { status: "ready", roadmapId, week1Ready };
  });
