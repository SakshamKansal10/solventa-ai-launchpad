import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireUser } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { NormalizedProfile } from "@/lib/profile/normalize";
import type { OpportunityCandidate, OpportunityPackage } from "@/lib/ai/schemas";
import {
  generateProofAssumptions,
  templateAssumptions,
  type ProofAssumptionPlan,
} from "@/lib/ai/prompts/proof-assumptions";
import { getSchemaCapabilities } from "@/lib/schema-capabilities.server";
import {
  DEFAULT_SUCCESS_THRESHOLD,
  deriveProofState,
  replayStateHistory,
  summarizeStates,
  type EvidenceType,
  type ProofState,
} from "@/lib/proof/state";

export const EVIDENCE_TYPES = [
  "interview",
  "quote",
  "payment",
  "observation",
  "experiment",
  "analytics",
  "document",
  "other",
] as const;

export interface EvidenceDTO {
  id: string;
  assumptionId: string | null;
  type: EvidenceType;
  sourcePerson: string | null;
  occurredOn: string;
  summary: string;
  signal: "supports" | "neutral" | "contradicts";
  url: string | null;
  fileName: string | null;
  hasFile: boolean;
  taskId: string | null;
  weekId: string | null;
  taskTitle: string | null;
  createdAt: string;
}

export interface AssumptionDTO {
  id: string;
  position: number;
  title: string;
  category: Database["public"]["Tables"]["proof_assumptions"]["Row"]["category"];
  whyItMatters: string | null;
  nextTest: string | null;
  threshold: number;
  state: ProofState;
  reason: { code: string; params: Record<string, number> };
  supporters: number;
  contradictors: number;
  evidence: EvidenceDTO[];
  history: {
    evidenceId: string;
    at: string;
    from: ProofState;
    to: ProofState;
    reason: { code: string; params: Record<string, number> };
  }[];
}

export interface ProofOverview {
  /** False until migration 0010 has been applied to this database. */
  available: boolean;
  opportunity: { id: string; title: string } | null;
  assumptions: AssumptionDTO[];
  /** Notes carried over from the old Evidence Vault, not yet linked to an assumption. */
  unassigned: EvidenceDTO[];
  needsGeneration: boolean;
  counts: Record<ProofState, number>;
}

type Db = SupabaseClient<Database>;
type EvidenceRow = Database["public"]["Tables"]["proof_evidence"]["Row"];
type AssumptionRow = Database["public"]["Tables"]["proof_assumptions"]["Row"];

const EMPTY_COUNTS: Record<ProofState, number> = {
  untested: 0,
  weak: 0,
  mixed: 0,
  supported: 0,
  contradicted: 0,
};

function toEvidenceDTO(row: EvidenceRow, taskTitles: Map<string, string>): EvidenceDTO {
  return {
    id: row.id,
    assumptionId: row.assumption_id,
    type: row.evidence_type,
    sourcePerson: row.source_person,
    occurredOn: row.occurred_on,
    summary: row.summary,
    signal: row.signal,
    url: row.url,
    fileName: row.file_name,
    hasFile: Boolean(row.file_path),
    taskId: row.task_id,
    weekId: row.week_id,
    taskTitle: row.task_id ? (taskTitles.get(row.task_id) ?? null) : null,
    createdAt: row.created_at,
  };
}

async function ownedOpportunity(supabase: Db, userId: string, opportunityId: string) {
  const { data } = await supabase
    .from("opportunities")
    .select("id, title, candidate, business_dna_id")
    .eq("id", opportunityId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw new Error("Opportunity not found");
  return data;
}

export function buildAssumptionDTOs(
  assumptions: AssumptionRow[],
  evidence: EvidenceRow[],
  taskTitles: Map<string, string>,
): AssumptionDTO[] {
  return [...assumptions]
    .sort((a, b) => a.position - b.position)
    .map((a) => {
      const rows = evidence.filter((e) => e.assumption_id === a.id);
      const threshold = a.success_threshold ?? DEFAULT_SUCCESS_THRESHOLD;
      const like = rows.map((e) => ({
        id: e.id,
        signal: e.signal,
        evidence_type: e.evidence_type,
        source_person: e.source_person,
        occurred_on: e.occurred_on,
        created_at: e.created_at,
      }));
      const result = deriveProofState(like, threshold);
      return {
        id: a.id,
        position: a.position,
        title: a.title,
        category: a.category,
        whyItMatters: a.why_it_matters,
        nextTest: a.next_test,
        threshold,
        state: result.state,
        reason: result.reason,
        supporters: result.supporters,
        contradictors: result.contradictors,
        evidence: rows
          .map((e) => toEvidenceDTO(e, taskTitles))
          .sort(
            (x, y) =>
              y.occurredOn.localeCompare(x.occurredOn) || y.createdAt.localeCompare(x.createdAt),
          ),
        history: replayStateHistory(like, threshold),
      };
    });
}

async function loadTaskTitles(supabase: Db, userId: string, evidence: EvidenceRow[]) {
  const ids = Array.from(
    new Set(evidence.map((e) => e.task_id).filter((x): x is string => Boolean(x))),
  );
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const { data } = await supabase
    .from("roadmap_tasks")
    .select("id, what")
    .eq("user_id", userId)
    .in("id", ids);
  for (const t of data ?? []) map.set(t.id, t.what);
  return map;
}

/** Everything the Proof workspace needs for one opportunity, computed fresh
 * from the recorded evidence — states are never stored, so they can't drift. */
export async function loadProofOverview(
  supabase: Db,
  userId: string,
  opportunityId: string,
): Promise<ProofOverview> {
  const caps = await getSchemaCapabilities(supabase);
  const opp = await ownedOpportunity(supabase, userId, opportunityId);
  if (!caps.proof) {
    return {
      available: false,
      opportunity: { id: opp.id, title: opp.title },
      assumptions: [],
      unassigned: [],
      needsGeneration: false,
      counts: { ...EMPTY_COUNTS },
    };
  }

  const [aRes, eRes] = await Promise.all([
    supabase
      .from("proof_assumptions")
      .select("*")
      .eq("opportunity_id", opportunityId)
      .eq("user_id", userId)
      .order("position"),
    supabase
      .from("proof_evidence")
      .select("*")
      .eq("opportunity_id", opportunityId)
      .eq("user_id", userId),
  ]);
  if (aRes.error) throw new Error(aRes.error.message);
  if (eRes.error) throw new Error(eRes.error.message);

  const evidence = eRes.data ?? [];
  const taskTitles = await loadTaskTitles(supabase, userId, evidence);
  const assumptions = buildAssumptionDTOs(aRes.data ?? [], evidence, taskTitles);

  return {
    available: true,
    opportunity: { id: opp.id, title: opp.title },
    assumptions,
    unassigned: evidence.filter((e) => !e.assumption_id).map((e) => toEvidenceDTO(e, taskTitles)),
    needsGeneration: assumptions.length === 0,
    counts: summarizeStates(assumptions.map((a) => a.state)),
  };
}

export const getProofOverview = createServerFn({ method: "GET" })
  .validator(z.object({ opportunityId: z.string().uuid() }))
  .handler(async ({ data }): Promise<ProofOverview> => {
    const { supabase, user } = await requireUser();
    return loadProofOverview(supabase, user.id, data.opportunityId);
  });

/** Creates the 3-4 critical assumptions for an opportunity exactly once.
 * (opportunity_id, position) is unique, so two concurrent first-opens converge
 * on one set; an AI failure falls back to a deterministic template so the
 * workspace is never a dead end. */
export const generateAssumptions = createServerFn({ method: "POST" })
  .validator(
    z.object({ opportunityId: z.string().uuid(), locale: z.enum(["en", "hi"]).optional() }),
  )
  .handler(async ({ data }): Promise<{ created: boolean; usedFallback: boolean }> => {
    const { supabase, user } = await requireUser();
    const caps = await getSchemaCapabilities(supabase);
    if (!caps.proof) throw new Error("PROOF_UNAVAILABLE");
    const opp = await ownedOpportunity(supabase, user.id, data.opportunityId);

    const existing = await supabase
      .from("proof_assumptions")
      .select("id", { count: "exact", head: true })
      .eq("opportunity_id", data.opportunityId)
      .eq("user_id", user.id);
    if ((existing.count ?? 0) > 0) return { created: false, usedFallback: false };

    const pkg = opp.candidate as unknown as OpportunityPackage | OpportunityCandidate;
    let plan: ProofAssumptionPlan[];
    let usedFallback = false;
    try {
      const dna = await supabase
        .from("business_dna")
        .select("normalized_signals")
        .eq("id", opp.business_dna_id)
        .single();
      if (dna.error || !dna.data) throw new Error("profile not found");
      plan = await generateProofAssumptions(
        dna.data.normalized_signals as unknown as NormalizedProfile,
        pkg,
        data.locale ?? "en",
      );
    } catch (err) {
      console.error("[proof] assumption generation failed, using template:", err);
      plan = templateAssumptions(pkg);
      usedFallback = true;
    }

    const { error } = await supabase.from("proof_assumptions").insert(
      plan.map((a, i) => ({
        user_id: user.id,
        opportunity_id: data.opportunityId,
        position: i,
        title: a.title,
        category: a.category,
        why_it_matters: a.whyItMatters,
        next_test: a.nextTest,
        success_threshold: a.successThreshold,
        origin: usedFallback ? ("template" as const) : ("ai" as const),
      })),
    );
    // 23505: another request created the set first — exactly what we wanted.
    if (error && error.code !== "23505") throw new Error(error.message);
    return { created: !error, usedFallback };
  });

const httpUrl = z
  .string()
  .max(500)
  .refine((v) => /^https?:\/\//i.test(v), "Only http(s) links are allowed.");

const evidenceInput = z.object({
  opportunityId: z.string().uuid(),
  assumptionId: z.string().uuid(),
  evidenceType: z.enum(EVIDENCE_TYPES),
  sourcePerson: z.string().trim().max(120).optional(),
  occurredOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  summary: z.string().trim().min(1).max(2000),
  signal: z.enum(["supports", "neutral", "contradicts"]),
  url: httpUrl.optional(),
  filePath: z.string().max(300).optional(),
  fileName: z.string().max(200).optional(),
  taskId: z.string().uuid().optional(),
  weekId: z.string().uuid().optional(),
});

async function stateForAssumption(supabase: Db, userId: string, assumptionId: string) {
  const [a, e] = await Promise.all([
    supabase
      .from("proof_assumptions")
      .select("success_threshold")
      .eq("id", assumptionId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("proof_evidence")
      .select("*")
      .eq("assumption_id", assumptionId)
      .eq("user_id", userId),
  ]);
  return deriveProofState(
    (e.data ?? []).map((row) => ({
      id: row.id,
      signal: row.signal,
      evidence_type: row.evidence_type,
      source_person: row.source_person,
      occurred_on: row.occurred_on,
      created_at: row.created_at,
    })),
    a.data?.success_threshold ?? DEFAULT_SUCCESS_THRESHOLD,
  );
}

/** Records one piece of real evidence against an assumption. Returns the
 * assumption's state before and after so the UI can say WHY it moved. */
export const addProofEvidence = createServerFn({ method: "POST" })
  .validator(evidenceInput)
  .handler(
    async ({
      data,
    }): Promise<{
      evidenceId: string;
      before: ProofState;
      after: ProofState;
      reasonCode: string;
    }> => {
      const { supabase, user } = await requireUser();
      const caps = await getSchemaCapabilities(supabase);
      if (!caps.proof) throw new Error("PROOF_UNAVAILABLE");
      await ownedOpportunity(supabase, user.id, data.opportunityId);

      // The assumption must be THIS founder's and belong to THIS opportunity —
      // never trust ids the client sent.
      const assumption = await supabase
        .from("proof_assumptions")
        .select("id")
        .eq("id", data.assumptionId)
        .eq("opportunity_id", data.opportunityId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!assumption.data) throw new Error("Assumption not found");

      if (data.taskId) {
        const task = await supabase
          .from("roadmap_tasks")
          .select("id")
          .eq("id", data.taskId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!task.data) throw new Error("Mission not found");
      }
      if (data.filePath && !data.filePath.startsWith(`${user.id}/`)) {
        throw new Error("Invalid file path");
      }

      const before = (await stateForAssumption(supabase, user.id, data.assumptionId)).state;

      const { data: inserted, error } = await supabase
        .from("proof_evidence")
        .insert({
          user_id: user.id,
          opportunity_id: data.opportunityId,
          assumption_id: data.assumptionId,
          evidence_type: data.evidenceType,
          source_person: data.sourcePerson || null,
          occurred_on: data.occurredOn ?? new Date().toISOString().slice(0, 10),
          summary: data.summary,
          signal: data.signal,
          url: data.url ?? null,
          file_path: data.filePath ?? null,
          file_name: data.fileName ?? null,
          task_id: data.taskId ?? null,
          week_id: data.weekId ?? null,
        })
        .select("id")
        .single();
      if (error || !inserted) throw new Error(error?.message ?? "Failed to save evidence");

      const after = await stateForAssumption(supabase, user.id, data.assumptionId);
      return {
        evidenceId: inserted.id,
        before,
        after: after.state,
        reasonCode: after.reason.code,
      };
    },
  );

export const updateProofEvidence = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      assumptionId: z.string().uuid().optional(),
      evidenceType: z.enum(EVIDENCE_TYPES).optional(),
      sourcePerson: z.string().trim().max(120).nullable().optional(),
      occurredOn: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      summary: z.string().trim().min(1).max(2000).optional(),
      signal: z.enum(["supports", "neutral", "contradicts"]).optional(),
      url: httpUrl.nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser();
    const { data: current } = await supabase
      .from("proof_evidence")
      .select("id, opportunity_id")
      .eq("id", data.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!current) throw new Error("Evidence not found");

    if (data.assumptionId) {
      const target = await supabase
        .from("proof_assumptions")
        .select("id")
        .eq("id", data.assumptionId)
        .eq("opportunity_id", current.opportunity_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!target.data) throw new Error("Assumption not found");
    }

    const patch: Database["public"]["Tables"]["proof_evidence"]["Update"] = {
      updated_at: new Date().toISOString(),
    };
    if (data.assumptionId) patch.assumption_id = data.assumptionId;
    if (data.evidenceType) patch.evidence_type = data.evidenceType;
    if (data.sourcePerson !== undefined) patch.source_person = data.sourcePerson || null;
    if (data.occurredOn) patch.occurred_on = data.occurredOn;
    if (data.summary) patch.summary = data.summary;
    if (data.signal) patch.signal = data.signal;
    if (data.url !== undefined) patch.url = data.url;

    const { error } = await supabase
      .from("proof_evidence")
      .update(patch)
      .eq("id", data.id)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteProofEvidence = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser();
    const { data: row } = await supabase
      .from("proof_evidence")
      .select("file_path")
      .eq("id", data.id)
      .eq("user_id", user.id)
      .maybeSingle();
    const { error } = await supabase
      .from("proof_evidence")
      .delete()
      .eq("id", data.id)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
    if (row?.file_path && row.file_path.startsWith(`${user.id}/`)) {
      // Best-effort: the row is already gone; an orphaned file is harmless.
      await supabase.storage.from("proof-files").remove([row.file_path]);
    }
    return { ok: true as const };
  });

/** A short-lived link to an attached file. Only the owner's own files. */
export const getProofFileUrl = createServerFn({ method: "GET" })
  .validator(z.object({ evidenceId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ url: string | null }> => {
    const { supabase, user } = await requireUser();
    const { data: row } = await supabase
      .from("proof_evidence")
      .select("file_path")
      .eq("id", data.evidenceId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!row?.file_path || !row.file_path.startsWith(`${user.id}/`)) return { url: null };
    const signed = await supabase.storage.from("proof-files").createSignedUrl(row.file_path, 300);
    return { url: signed.data?.signedUrl ?? null };
  });

export interface ProofSummary {
  available: boolean;
  total: number;
  counts: Record<ProofState, number>;
}

/** Compact counts for the Opportunity → Proof tab and the Command Center pulse. */
export async function loadProofSummary(
  supabase: Db,
  userId: string,
  opportunityId: string,
): Promise<ProofSummary> {
  const overview = await loadProofOverview(supabase, userId, opportunityId).catch(() => null);
  if (!overview || !overview.available) {
    return { available: false, total: 0, counts: { ...EMPTY_COUNTS } };
  }
  return { available: true, total: overview.assumptions.length, counts: overview.counts };
}

export const getProofSummary = createServerFn({ method: "GET" })
  .validator(z.object({ opportunityId: z.string().uuid() }))
  .handler(async ({ data }): Promise<ProofSummary> => {
    const { supabase, user } = await requireUser();
    return loadProofSummary(supabase, user.id, data.opportunityId);
  });
