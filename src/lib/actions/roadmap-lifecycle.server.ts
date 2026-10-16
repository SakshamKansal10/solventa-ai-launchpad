import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import type {
  OpportunityPackage,
  RoadmapSkeletonPlan,
  RoadmapWeekDetailPlan,
} from "@/lib/ai/schemas";
import type { NormalizedProfile } from "@/lib/profile/normalize";
import { MODEL } from "@/lib/ai/gemini.server";
import { generateRoadmapSkeleton, generateWeekDetail } from "@/lib/ai/prompts/roadmap-generation";
import type { GenerationLocale } from "@/lib/ai/prompts/shared";
import {
  getSchemaCapabilities,
  isSchemaMissingError,
  type SchemaCapabilities,
} from "@/lib/schema-capabilities.server";
import { GENERATION_LOCK_TTL_MS } from "@/lib/roadmap/state";
import { loadProofOverview } from "@/lib/actions/proof";

type Db = SupabaseClient<Database>;

const dayMs = 86_400_000;
const isoDate = (ref: Date, days: number) =>
  new Date(ref.getTime() + days * dayMs).toISOString().slice(0, 10);

/** ---- roadmap row ---------------------------------------------------------
 * One roadmap per opportunity. The row is created FIRST, in 'building', so a
 * refresh, a second tab or a network retry finds it and resumes instead of
 * starting a second generation. Without migration 0010 the extra states don't
 * exist, so the row is created as 'active' after the skeleton (the old order). */

export async function findRoadmapForOpportunity(db: Db, userId: string, opportunityId: string) {
  const { data, error } = await db
    .from("roadmaps")
    .select("*")
    .eq("user_id", userId)
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function archiveOtherActiveRoadmaps(db: Db, userId: string, keepRoadmapId?: string) {
  let q = db
    .from("roadmaps")
    .update({ status: "archived" })
    .eq("user_id", userId)
    .eq("status", "active");
  if (keepRoadmapId) q = q.neq("id", keepRoadmapId);
  const { error } = await q;
  if (error) throw new Error(error.message);
}

/** ---- skeleton -------------------------------------------------------------- */

export async function persistSkeleton(
  db: Db,
  userId: string,
  roadmapId: string,
  skeleton: RoadmapSkeletonPlan,
  now: Date,
  caps: SchemaCapabilities,
): Promise<void> {
  let globalNumber = 0;
  for (let i = 0; i < skeleton.phases.length; i++) {
    const phase = skeleton.phases[i];
    const { data: phaseRow, error: phaseError } = await db
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

    const weekRows = phase.weeks.map((week, w) => {
      globalNumber += 1;
      const first = globalNumber === 1;
      return {
        phase_id: phaseRow.id,
        user_id: userId,
        order_index: w,
        week_number: week.weekNumber,
        title: week.title,
        objective: week.objective,
        status: first ? ("active" as const) : ("locked" as const),
        unlocked_at: first ? now.toISOString() : null,
        ...(caps.weekLock ? { roadmap_id: roadmapId, global_number: globalNumber } : {}),
      };
    });
    const { error: weekError } = await db.from("roadmap_weeks").insert(weekRows);
    if (weekError) throw new Error(weekError.message);
  }
}

/** ---- generation lock -------------------------------------------------------- */

export type LockResult = "acquired" | "ready" | "busy";

/**
 * Takes exclusive ownership of generating ONE week's detail. The
 * compare-and-swap is a single UPDATE … WHERE (idle|failed|stale) RETURNING —
 * atomic in Postgres — so two concurrent requests (a double click, a retry, two
 * tabs) can never both win. A lock older than the TTL is treated as abandoned,
 * so a request that died mid-generation cannot wedge the week forever.
 *
 * Without migration 0010 there is no lock column; the check degrades to "does
 * it already have missions" (the pre-0010 behaviour, which is racy but safe to
 * run) and the caller is told so it can log it.
 */
export async function acquireWeekLock(
  db: Db,
  userId: string,
  weekId: string,
  caps: SchemaCapabilities,
): Promise<LockResult> {
  const { count } = await db
    .from("roadmap_tasks")
    .select("id", { count: "exact", head: true })
    .eq("week_id", weekId)
    .eq("user_id", userId);
  if ((count ?? 0) > 0) return "ready";
  if (!caps.weekLock) return "acquired";

  const cutoff = new Date(Date.now() - GENERATION_LOCK_TTL_MS).toISOString();
  const { data: attemptsRow } = await db
    .from("roadmap_weeks")
    .select("generation_attempts")
    .eq("id", weekId)
    .eq("user_id", userId)
    .maybeSingle();

  const { data, error } = await db
    .from("roadmap_weeks")
    .update({
      generation_status: "generating",
      generation_started_at: new Date().toISOString(),
      generation_attempts: (attemptsRow?.generation_attempts ?? 0) + 1,
      generation_error: null,
    })
    .eq("id", weekId)
    .eq("user_id", userId)
    .neq("generation_status", "ready")
    .or(
      `generation_status.in.(idle,failed),generation_started_at.is.null,generation_started_at.lt.${cutoff}`,
    )
    .select("id");
  if (error) {
    if (isSchemaMissingError(error)) return "acquired";
    throw new Error(error.message);
  }
  return (data ?? []).length > 0 ? "acquired" : "busy";
}

async function releaseWeekLock(
  db: Db,
  userId: string,
  weekId: string,
  outcome: { ok: true } | { ok: false; error: string },
  caps: SchemaCapabilities,
) {
  if (!caps.weekLock) return;
  await db
    .from("roadmap_weeks")
    .update(
      outcome.ok
        ? { generation_status: "ready" as const, generation_error: null }
        : { generation_status: "failed" as const, generation_error: outcome.error.slice(0, 500) },
    )
    .eq("id", weekId)
    .eq("user_id", userId);
}

/** ---- week detail ------------------------------------------------------------ */

export interface WeekContext {
  id: string;
  phaseId: string;
  weekNumber: number;
  title: string;
  objective: string;
  phaseTitle: string;
  phaseDescription: string;
}

export async function persistWeekDetail(
  db: Db,
  userId: string,
  week: { id: string; phaseId: string },
  detail: RoadmapWeekDetailPlan,
  now: Date,
  caps: SchemaCapabilities,
): Promise<void> {
  const weekPatch: Database["public"]["Tables"]["roadmap_weeks"]["Update"] = {
    mission: detail.mission,
    mistakes_to_avoid:
      detail.mistakesToAvoid as unknown as Database["public"]["Tables"]["roadmap_weeks"]["Row"]["mistakes_to_avoid"],
    evidence_required: detail.evidenceRequired,
    success_threshold: detail.successThreshold,
  };
  if (caps.weekLock) {
    weekPatch.evidence_target = detail.evidenceTarget ?? null;
    weekPatch.adaptation_note = detail.adaptationNote ?? null;
  }
  const { error: updateError } = await db
    .from("roadmap_weeks")
    .update(weekPatch)
    .eq("id", week.id)
    .eq("user_id", userId);
  if (updateError) throw new Error(updateError.message);

  const rows = detail.tasks.map((task, i) => {
    // Clamp into this week's real 0-6 day window regardless of what the model returned.
    const day = Math.min(Math.max(Math.round(task.deadlineDaysFromStart), 0), 6);
    return {
      phase_id: week.phaseId,
      week_id: week.id,
      user_id: userId,
      order_index: i,
      what: task.what,
      why: task.why,
      how: task.how,
      resource: task.resource,
      time_estimate: task.timeEstimate,
      deadline_days_from_start: day,
      deadline: isoDate(now, day),
      done_when: task.doneWhen,
      required: task.required,
      depends_on: task.dependsOn,
      status: "pending" as const,
      ...(caps.weekLock
        ? {
            steps: (task.steps ??
              null) as unknown as Database["public"]["Tables"]["roadmap_tasks"]["Row"]["steps"],
            evidence_required: task.evidenceRequired ?? false,
            assumption_category: task.assumptionCategory ?? null,
          }
        : {}),
    };
  });
  const { error: taskError } = await db.from("roadmap_tasks").insert(rows);
  // 23505: another request already wrote this week's missions (the unique
  // (week_id, order_index) index) — the week is complete, which is the goal.
  if (taskError && taskError.code !== "23505") throw new Error(taskError.message);
}

export interface GenerationInputs {
  profile: NormalizedProfile;
  opportunity: OpportunityPackage;
}

export async function loadGenerationInputs(
  db: Db,
  userId: string,
  opportunityId: string,
): Promise<GenerationInputs> {
  const { data: opp, error } = await db
    .from("opportunities")
    .select("candidate, business_dna_id")
    .eq("id", opportunityId)
    .eq("user_id", userId)
    .single();
  if (error || !opp) throw new Error(error?.message ?? "Opportunity not found");
  const { data: dna, error: dnaError } = await db
    .from("business_dna")
    .select("normalized_signals")
    .eq("id", opp.business_dna_id)
    .single();
  if (dnaError || !dna) throw new Error(dnaError?.message ?? "Founder profile not found");
  return {
    profile: dna.normalized_signals as unknown as NormalizedProfile,
    opportunity: opp.candidate as unknown as OpportunityPackage,
  };
}

/** What actually happened last week, as data the model may use: the recorded
 * evidence (counts + the latest summaries) and where each assumption stands.
 * Only real records — never anything the founder did not write down. */
export async function summarizeEvidenceForPrompt(
  db: Db,
  userId: string,
  opportunityId: string,
  weekId: string,
): Promise<{ evidenceSummary: string | null; assumptionStates: string | null }> {
  try {
    const overview = await loadProofOverview(db, userId, opportunityId);
    if (!overview.available) return { evidenceSummary: null, assumptionStates: null };
    const thisWeek = overview.assumptions
      .flatMap((a) => a.evidence)
      .filter((e) => e.weekId === weekId);
    const evidenceSummary =
      thisWeek.length === 0
        ? null
        : `${thisWeek.length} item(s): ${thisWeek.filter((e) => e.signal === "supports").length} supporting, ${thisWeek.filter((e) => e.signal === "contradicts").length} contradicting, ${thisWeek.filter((e) => e.signal === "neutral").length} neutral. Latest: ${thisWeek
            .slice(0, 3)
            .map((e) => `"${e.summary.slice(0, 140)}"`)
            .join("; ")}`;
    const assumptionStates =
      overview.assumptions.length === 0
        ? null
        : overview.assumptions
            .map((a) => `${a.category}: ${a.state} (${a.evidence.length} evidence)`)
            .join("; ");
    return { evidenceSummary, assumptionStates };
  } catch (err) {
    console.error("[roadmap] evidence summary unavailable (non-fatal):", err);
    return { evidenceSummary: null, assumptionStates: null };
  }
}

export interface PriorWeekInput {
  title: string;
  completedTasks: string[];
  reflection: string | null;
  outcome: "stronger" | "as_expected" | "weaker" | "mixed" | null;
  blocker: string | null;
  evidenceSummary: string | null;
  assumptionStates: string | null;
}

/** Generates and stores ONE week's detail, exactly once. Returns whether this
 * call did the work, found it already done, or found another request doing it. */
export async function generateWeekOnce(
  db: Db,
  userId: string,
  opportunityId: string,
  week: WeekContext,
  prior: PriorWeekInput | null,
  locale: GenerationLocale | undefined,
): Promise<"generated" | "already_ready" | "in_progress"> {
  const caps = await getSchemaCapabilities(db);
  const lock = await acquireWeekLock(db, userId, week.id, caps);
  if (lock === "ready") return "already_ready";
  if (lock === "busy") return "in_progress";

  try {
    const { profile, opportunity } = await loadGenerationInputs(db, userId, opportunityId);
    const detail = await generateWeekDetail(
      profile,
      opportunity,
      {
        phaseTitle: week.phaseTitle,
        phaseDescription: week.phaseDescription,
        weekTitle: week.title,
        weekObjective: week.objective,
        weekNumber: week.weekNumber,
        priorWeek: prior,
      },
      locale,
    );
    await persistWeekDetail(db, userId, week, detail, new Date(), caps);
    await releaseWeekLock(db, userId, week.id, { ok: true }, caps);
    return "generated";
  } catch (err) {
    console.error("[roadmap] week detail generation failed:", err);
    await releaseWeekLock(
      db,
      userId,
      week.id,
      { ok: false, error: err instanceof Error ? err.message : "Generation failed" },
      caps,
    ).catch(() => undefined);
    throw err;
  }
}

/** ---- build -------------------------------------------------------------------- */

export async function createBuildingRoadmap(
  db: Db,
  userId: string,
  opportunityId: string,
  caps: SchemaCapabilities,
): Promise<{ id: string; created: boolean }> {
  const insert = await db
    .from("roadmaps")
    .insert({
      user_id: userId,
      opportunity_id: opportunityId,
      status: caps.roadmapStates ? "building" : "active",
      ai_model: MODEL,
    })
    .select("id")
    .single();
  if (!insert.error && insert.data) return { id: insert.data.id, created: true };
  // 23505: another request created it first (unique per opportunity / one active per user).
  const existing = await findRoadmapForOpportunity(db, userId, opportunityId);
  if (existing) return { id: existing.id, created: false };
  throw new Error(insert.error?.message ?? "Failed to create roadmap");
}

export { generateRoadmapSkeleton };
