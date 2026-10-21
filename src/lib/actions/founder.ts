import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireUser } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { resolveDirection, type Direction, type DirectionOpportunity } from "@/lib/direction";
import { isSchemaMissingError } from "@/lib/schema-capabilities.server";
import { assessFit, fitSortScore, type FitLabel } from "@/lib/fit/model";
import { keepSupportedReasons } from "@/lib/ai/integrity";
import type { FitFactors } from "@/lib/ai/schemas";
import type { NormalizedProfile } from "@/lib/profile/normalize";

/** Cards throughout the product (Command Center, Opportunities, History) show
 * the same six plain facts about an opportunity. This is the one place they
 * are read, straight out of the stored package with JSON-path selects, so the
 * full (large) candidate blob is never shipped for a list. */
export interface OpportunityBrief {
  id: string;
  title: string;
  oneLiner: string;
  customer: string | null;
  problem: string | null;
  product: string | null;
  /** Up to two founder-specific reasons this fits. */
  whyFit: string[];
  scalePath: string | null;
  status: DirectionOpportunity["status"];
  consultationId: string;
  batch: number;
  createdAt: string;
  /** The canonical founder-fit label (src/lib/fit/model.ts) — the same one every screen shows. */
  fit: FitLabel;
  /** Plain-words category ("local service", "digital product") — picks the direction's icon. */
  category: string | null;
}

export interface FounderState {
  direction: Direction;
  briefs: Record<string, OpportunityBrief>;
  consultations: { id: string; createdAt: string }[];
  /** When the consultation being viewed was completed. */
  viewedConsultationAt: string | null;
}

interface OppRow {
  id: string;
  business_dna_id: string;
  title: string;
  one_liner: string;
  who_for: string | null;
  status: DirectionOpportunity["status"];
  fit_score: number;
  opportunity_index: number | null;
  batch_number: number;
  created_at: string;
  customer: string | null;
  problem: string | null;
  solution: string | null;
  revenue: string | null;
  why: unknown;
  signals: FitFactors | null;
  category: string | null;
}

const BASE_COLUMNS =
  "id, business_dna_id, title, one_liner, who_for, status, fit_score, batch_number, created_at, customer:candidate->>customer, problem:candidate->>problem, solution:candidate->>solution, revenue:candidate->>revenuePath, why:candidate->whyThisFounder, signals:candidate->fitSignals, category:candidate->>category";

/** Reads every opportunity as a light row. `opportunity_index` (migration 0009)
 * is requested first and dropped if the column doesn't exist, so a database
 * that hasn't had it applied still works exactly as before. */
async function loadOpportunityRows(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<OppRow[]> {
  const db = supabase as unknown as SupabaseClient;
  const query = (columns: string) =>
    db.from("opportunities").select(columns).eq("user_id", userId).order("created_at");
  let res = await query(`${BASE_COLUMNS}, opportunity_index`);
  if (res.error && isSchemaMissingError(res.error)) res = await query(BASE_COLUMNS);
  if (res.error) throw new Error(res.error.message);
  return ((res.data ?? []) as unknown as Partial<OppRow>[]).map((r) => ({
    opportunity_index: null,
    ...r,
  })) as OppRow[];
}

function toBrief(r: OppRow, profile: NormalizedProfile | null): OpportunityBrief {
  const why = Array.isArray(r.why)
    ? (r.why as unknown[]).filter((w): w is string => typeof w === "string")
    : [];
  return {
    id: r.id,
    title: r.title,
    oneLiner: r.one_liner,
    customer: r.customer ?? r.who_for,
    problem: r.problem,
    product: r.solution,
    whyFit: keepSupportedReasons(why, profile).slice(0, 2),
    scalePath: r.revenue,
    status: r.status,
    consultationId: r.business_dna_id,
    batch: r.batch_number,
    createdAt: r.created_at,
    fit: profile && r.signals ? assessFit(profile, r.signals).label : "provisional",
    category: r.category ?? null,
  };
}

export async function loadFounderState(
  supabase: SupabaseClient<Database>,
  userId: string,
  pinnedConsultationId: string | null,
): Promise<FounderState> {
  const [profileRes, dnaRes, oppRows, roadmapRes] = await Promise.all([
    // select("*") so a database without migration 0010's profile columns still answers.
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("business_dna")
      .select("id, created_at, normalized_signals")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    loadOpportunityRows(supabase, userId),
    supabase.from("roadmaps").select("id, opportunity_id, status").eq("user_id", userId),
  ]);
  if (dnaRes.error) throw new Error(dnaRes.error.message);
  if (roadmapRes.error) throw new Error(roadmapRes.error.message);

  const profile = profileRes.data as
    (Database["public"]["Tables"]["profiles"]["Row"] & Record<string, unknown>) | null;

  const profileByDna = new Map(
    (dnaRes.data ?? []).map((d) => [
      d.id,
      d.normalized_signals as unknown as NormalizedProfile | null,
    ]),
  );
  // Ranked by the same live assessment every screen shows (provisional last),
  // so the order and the fit labels can never disagree.
  const liveFit = (o: OppRow) => {
    const p = profileByDna.get(o.business_dna_id);
    return p && o.signals ? fitSortScore(assessFit(p, o.signals)) : -1;
  };

  const direction = resolveDirection({
    consultations: dnaRes.data ?? [],
    opportunities: oppRows.map((o) => ({
      id: o.id,
      business_dna_id: o.business_dna_id,
      status: o.status,
      fit_score: liveFit(o),
      opportunity_index: o.opportunity_index,
      batch_number: o.batch_number,
      created_at: o.created_at,
    })),
    roadmaps: (roadmapRes.data ?? []) as {
      id: string;
      opportunity_id: string;
      status: "available" | "building" | "active" | "completed" | "failed" | "archived";
    }[],
    activePointer: {
      opportunityId: (profile?.active_opportunity_id as string | null | undefined) ?? null,
      setAt: (profile?.active_opportunity_set_at as string | null | undefined) ?? null,
    },
    pinnedConsultationId,
  });

  const briefs: Record<string, OpportunityBrief> = {};
  for (const row of oppRows)
    briefs[row.id] = toBrief(row, profileByDna.get(row.business_dna_id) ?? null);

  const consultations = (dnaRes.data ?? []).map((d) => ({ id: d.id, createdAt: d.created_at }));
  return {
    direction,
    briefs,
    consultations,
    viewedConsultationAt:
      consultations.find((c) => c.id === direction.consultationId)?.createdAt ?? null,
  };
}

/** The single read every founder screen shares: which consultation is current,
 * what the direction/roadmap stage is, and a brief for every opportunity. */
export const getFounderState = createServerFn({ method: "GET" })
  .validator(z.object({ consultationId: z.string().uuid().optional() }).optional())
  .handler(async ({ data }): Promise<FounderState> => {
    const { supabase, user } = await requireUser();
    return loadFounderState(supabase, user.id, data?.consultationId ?? null);
  });
