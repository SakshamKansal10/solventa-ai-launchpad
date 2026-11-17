import type { SupabaseClient } from "@supabase/supabase-js";

import { assessFit } from "@/lib/fit/model";
import { generateOpportunityPackageBatch } from "@/lib/ai/prompts/intelligence-package";
import { MODEL } from "@/lib/ai/gemini.server";
import type { OpportunityPackage } from "@/lib/ai/schemas";
import { DIRECTION_NUMBER_KIND } from "@/lib/market/number-kind";
import type { NormalizedProfile } from "@/lib/profile/normalize";
import type { Database, Json } from "@/lib/supabase/types";
import type { JobStep } from "@/lib/actions/generation-jobs.server";

type Db = SupabaseClient<Database>;

/** How many directions one "Find more" adds. */
export const CANDIDATES_PER_BATCH = 3;

export async function loadLatestBusinessDna(supabase: Db, userId: string) {
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
export async function persistOpportunityPackage(
  supabase: Db,
  userId: string,
  businessDnaId: string,
  profile: NormalizedProfile,
  pkg: OpportunityPackage,
  batchNumber: number,
) {
  // The canonical founder-fit assessment, stored once with its rubric version.
  const assessment = assessFit(profile, pkg.fitSignals);

  const { data: oppRow, error: oppError } = await supabase
    .from("opportunities")
    .insert({
      user_id: userId,
      business_dna_id: businessDnaId,
      title: pkg.title,
      one_liner: pkg.plainEnglishSummary,
      who_for: pkg.customer,
      fit_score: assessment.score ?? 0,
      score_breakdown: assessment as unknown as Json,
      // A direction's numbers are estimates by construction (part 4, feature 6).
      candidate: { ...pkg, numberKind: DIRECTION_NUMBER_KIND } as unknown as Json,
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

/**
 * "Find 3 more directions": one AI call for a new set in the founder's latest consultation,
 * never repeating a direction they already have (dismissed ones say why). The set is a new
 * batch: the Directions page shows it; earlier sets stay under History. Reports its real steps.
 */
export async function generateDirectionBatch(
  supabase: Db,
  userId: string,
  opts: { locale?: "en" | "hi"; onStep?: (step: JobStep) => Promise<void> },
): Promise<{ businessDnaId: string; batchNumber: number; added: number }> {
  await opts.onStep?.("reading");
  const dna = await loadLatestBusinessDna(supabase, userId);
  const profile = dna.normalized_signals as unknown as NormalizedProfile;

  await opts.onStep?.("fitting");
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

  await opts.onStep?.("writing");
  const batch = await generateOpportunityPackageBatch(profile, {
    excludeTitles,
    dismissedNotes,
    count: CANDIDATES_PER_BATCH,
    locale: opts.locale,
  });

  let added = 0;
  for (const pkg of batch.opportunities) {
    await persistOpportunityPackage(supabase, userId, dna.id, profile, pkg, nextBatch);
    added += 1;
  }
  return { businessDnaId: dna.id, batchNumber: nextBatch, added };
}
