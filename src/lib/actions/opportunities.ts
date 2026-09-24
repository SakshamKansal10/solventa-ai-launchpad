import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireUser } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";
import type { NormalizedProfile } from "@/lib/profile/normalize";
import { computeFitScore, getConstraintWarnings } from "@/lib/profile/scoring";
import { computeFitMatrix, type FitMatrix } from "@/lib/fit/matrix";
import { generateOpportunityPackageBatch } from "@/lib/ai/prompts/intelligence-package";
import { generateOpportunityDetail } from "@/lib/ai/prompts/opportunity-detail";
import { researchMarketEvidence } from "@/lib/ai/prompts/market-research";
import { MODEL } from "@/lib/ai/gemini.server";
import {
  archiveActiveRoadmapsExcept,
  selectOpportunityRow,
  setActivePointer,
} from "@/lib/actions/direction.server";
import { loadFounderState, type OpportunityBrief } from "@/lib/actions/founder";
import { loadProofSummary, type ProofSummary } from "@/lib/actions/proof";
import {
  getFitFactors,
  toDisplayDetail,
  type OpportunityDisplayDetail,
} from "@/lib/opportunity-display";
import type {
  OpportunityCandidate,
  OpportunityPackage,
  MarketEvidenceItem,
} from "@/lib/ai/schemas";

const CANDIDATES_PER_BATCH = 3;
const RESEARCH_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** The underlying market question doesn't change per-user, so it is cached
 * across everyone. Exact-match on category+title only (no fuzzy matching). */
async function getOrFetchMarketEvidence(
  supabase: SupabaseClient<Database>,
  title: string,
  oneLiner: string,
  category: string,
): Promise<MarketEvidenceItem[]> {
  const cacheKey = `${category.toLowerCase().trim()}::${title.toLowerCase().trim()}`;

  const cached = await supabase
    .from("research_cache")
    .select("result, expires_at")
    .eq("cache_key", cacheKey)
    .maybeSingle();
  if (cached.data && new Date(cached.data.expires_at) > new Date()) {
    return cached.data.result as unknown as MarketEvidenceItem[];
  }

  const items = await researchMarketEvidence(title, oneLiner, category);

  await supabase.from("research_cache").upsert({
    cache_key: cacheKey,
    query: `${category} — ${title}`,
    result: items as unknown as Json,
    sources: items.map((i) => ({ title: i.sourceTitle, url: i.sourceUrl })) as unknown as Json[],
    expires_at: new Date(Date.now() + RESEARCH_CACHE_TTL_MS).toISOString(),
  });

  return items;
}

async function loadLatestBusinessDna(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from("business_dna")
    .select("id, normalized_signals")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No founder profile found — complete the consultation first.");
  return data;
}

/** Persists one full opportunity package (the candidate JSON carries the
 * complete detail; opportunity_details mirrors it). No roadmap and no second
 * AI call happens here. */
async function persistOpportunityPackage(
  supabase: SupabaseClient<Database>,
  userId: string,
  businessDnaId: string,
  profile: NormalizedProfile,
  pkg: OpportunityPackage,
  batchNumber: number,
) {
  const score = computeFitScore(profile, pkg.fitSignals);

  const { data: oppRow, error: oppError } = await supabase
    .from("opportunities")
    .insert({
      user_id: userId,
      business_dna_id: businessDnaId,
      title: pkg.title,
      one_liner: pkg.plainEnglishSummary,
      who_for: pkg.customer,
      fit_score: score.total,
      score_breakdown: score as unknown as Json,
      candidate: pkg as unknown as Json,
      status: "active" as const,
      batch_number: batchNumber,
      ai_model: MODEL,
    })
    .select("*")
    .single();
  if (oppError || !oppRow) throw new Error(oppError?.message ?? "Failed to save opportunity");

  const { error: detailError } = await supabase.from("opportunity_details").insert({
    opportunity_id: oppRow.id,
    user_id: userId,
    detail: pkg as unknown as Json,
    ai_model: MODEL,
  });
  if (detailError) throw new Error(detailError.message);

  return oppRow;
}

/** "Explore More Opportunities" — the one explicit, user-triggered AI call for
 * more directions. None is made active automatically: exploring more never
 * silently switches a direction the founder is already on. */
export const exploreMoreOpportunities = createServerFn({ method: "POST" })
  .validator(z.object({ locale: z.enum(["en", "hi"]).optional() }).optional())
  .handler(async ({ data: input }): Promise<{ added: number }> => {
    const { supabase, user } = await requireUser();
    const dna = await loadLatestBusinessDna(supabase, user.id);
    const profile = dna.normalized_signals as unknown as NormalizedProfile;

    const { data: existing, error } = await supabase
      .from("opportunities")
      .select("title, status, dismiss_reason, batch_number")
      .eq("business_dna_id", dna.id);
    if (error) throw new Error(error.message);

    const excludeTitles = (existing ?? []).map((o) => o.title);
    const dismissedNotes = (existing ?? [])
      .filter((o) => o.status === "dismissed" && o.dismiss_reason)
      .map((o) => `"${o.title}" was dismissed because: ${o.dismiss_reason}`);
    const nextBatch = Math.max(1, ...(existing ?? []).map((o) => o.batch_number)) + 1;

    const batch = await generateOpportunityPackageBatch(profile, {
      excludeTitles,
      dismissedNotes,
      count: CANDIDATES_PER_BATCH,
      locale: input?.locale,
    });

    let added = 0;
    for (const pkg of batch.opportunities) {
      await persistOpportunityPackage(supabase, user.id, dna.id, profile, pkg, nextBatch);
      added += 1;
    }
    return { added };
  });

export interface FitDetail {
  matrix: FitMatrix;
  /** Founder-specific reasons this fits (from the generated package). */
  advantages: string[];
  /** Named gaps: skills to learn plus tradeoffs. */
  gaps: string[];
  warnings: string[];
  currency: string;
  capital: number;
  weeklyHours: number;
}

export interface OpportunityDetailDTO {
  brief: OpportunityBrief;
  detail: OpportunityDisplayDetail;
  fit: FitDetail;
  /** Sources from a cited market search, if the founder ran one. */
  sources: {
    id: string;
    claim: string;
    label: MarketEvidenceItem["label"];
    sourceTitle: string | null;
    sourceUrl: string | null;
  }[];
  proof: ProofSummary;
  isSelected: boolean;
  isCurrentConsultation: boolean;
  roadmapStatus: "none" | "building" | "active" | "completed" | "failed" | "archived";
}

export const getOpportunityDetail = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }): Promise<OpportunityDetailDTO> => {
    const { supabase, user } = await requireUser();

    const { data: opportunity, error } = await supabase
      .from("opportunities")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", user.id)
      .single();
    if (error || !opportunity) throw new Error(error?.message ?? "Opportunity not found");

    // None of these depend on each other — only on `opportunity` above.
    const [dnaRow, detailRes, evidenceRes, roadmapRes, state, proof] = await Promise.all([
      supabase
        .from("business_dna")
        .select("normalized_signals, ambition_band")
        .eq("id", opportunity.business_dna_id)
        .single(),
      supabase
        .from("opportunity_details")
        .select("detail")
        .eq("opportunity_id", opportunity.id)
        .maybeSingle(),
      supabase.from("opportunity_evidence").select("*").eq("opportunity_id", opportunity.id),
      supabase
        .from("roadmaps")
        .select("status")
        .eq("opportunity_id", opportunity.id)
        .eq("user_id", user.id)
        .maybeSingle(),
      loadFounderState(supabase, user.id, null),
      loadProofSummary(supabase, user.id, opportunity.id),
    ]);
    if (dnaRow.error || !dnaRow.data)
      throw new Error("Founder profile not found for this opportunity");
    const profile = dnaRow.data.normalized_signals as unknown as NormalizedProfile;

    let detailRow = detailRes.data;
    if (!detailRow) {
      // Only pre-one-call rows ever reach this: newer ones mirror their detail at creation.
      const generated = await generateOpportunityDetail(
        profile,
        opportunity.candidate as unknown as OpportunityCandidate,
      );
      const inserted = await supabase
        .from("opportunity_details")
        .insert({
          opportunity_id: opportunity.id,
          user_id: user.id,
          detail: generated as unknown as Json,
          ai_model: MODEL,
        })
        .select("detail")
        .single();
      if (inserted.error) throw new Error(inserted.error.message);
      detailRow = inserted.data;
    }

    const display = toDisplayDetail(detailRow.detail as unknown as OpportunityPackage);
    const factors = getFitFactors(opportunity.candidate as unknown as OpportunityPackage);
    const warnings = getConstraintWarnings(profile, factors);
    const matrix = computeFitMatrix(profile, factors, dnaRow.data.ambition_band, warnings.length);

    const gaps = [...display.skillsToLearn.map((s) => s), ...display.tradeoffs].slice(0, 3);

    const brief = state.briefs[opportunity.id];
    return {
      brief,
      detail: display,
      fit: {
        matrix,
        advantages: (display.whyThisFounder.length > 0
          ? display.whyThisFounder
          : display.advantages
        ).slice(0, 4),
        gaps,
        warnings,
        currency: profile.identity.currency,
        capital: profile.resources.capitalAmount,
        weeklyHours: profile.time.weeklyHours,
      },
      sources: (evidenceRes.data ?? []).map((e) => ({
        id: e.id,
        claim: e.claim,
        label: e.label,
        sourceTitle: e.source_title,
        sourceUrl: e.source_url,
      })),
      proof,
      isSelected: opportunity.status === "selected",
      isCurrentConsultation: opportunity.business_dna_id === state.direction.consultationId,
      roadmapStatus: (roadmapRes.data?.status === "available"
        ? "archived"
        : (roadmapRes.data?.status ?? "none")) as OpportunityDetailDTO["roadmapStatus"],
    };
  });

/** Cited market research — the only path that ever makes a live search call,
 * and only on an explicit click. Never runs on navigation. Cached globally
 * per category+title for 30 days. */
export const refreshMarketEvidence = createServerFn({ method: "POST" })
  .validator(z.object({ opportunityId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser();

    const { data: opportunity, error } = await supabase
      .from("opportunities")
      .select("id, title, one_liner, candidate")
      .eq("id", data.opportunityId)
      .eq("user_id", user.id)
      .single();
    if (error || !opportunity) throw new Error(error?.message ?? "Opportunity not found");

    const items = await getOrFetchMarketEvidence(
      supabase,
      opportunity.title,
      opportunity.one_liner,
      (opportunity.candidate as unknown as OpportunityCandidate).category,
    );

    // Replace rather than accumulate.
    await supabase.from("opportunity_evidence").delete().eq("opportunity_id", opportunity.id);
    const rows = items.map((item) => ({
      opportunity_id: opportunity.id,
      user_id: user.id,
      claim: item.claim,
      label: item.label,
      source_title: item.sourceTitle,
      source_url: item.sourceUrl,
    }));
    if (rows.length > 0) {
      const inserted = await supabase.from("opportunity_evidence").insert(rows);
      if (inserted.error) throw new Error(inserted.error.message);
    }
    return { count: rows.length };
  });

/** Choosing a direction costs ZERO AI calls: it selects the opportunity,
 * archives (never deletes) any other active roadmap, and records the explicit
 * choice. The roadmap itself is a separate, explicit step (buildRoadmap). */
export const chooseDirection = createServerFn({ method: "POST" })
  .validator(z.object({ opportunityId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser();
    await selectOpportunityRow(supabase, user.id, data.opportunityId);
    await archiveActiveRoadmapsExcept(supabase, user.id, data.opportunityId);
    await setActivePointer(supabase, user.id, data.opportunityId);
    return { ok: true as const };
  });
