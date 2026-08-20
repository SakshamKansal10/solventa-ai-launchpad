import crypto from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireUser } from "@/lib/supabase/server";
import { normalizeProfile, type NormalizedProfile } from "@/lib/profile/normalize";
import { computeFitScore } from "@/lib/profile/scoring";
import { generateIntelligencePackage } from "@/lib/ai/prompts/intelligence-package";
import { MODEL } from "@/lib/ai/gemini.server";
import { createRoadmap } from "@/lib/actions/roadmap-persistence.server";
import { sendRoadmapReadyEmail } from "@/lib/actions/email.server";
import type { Json } from "@/lib/supabase/types";

// OnboardingAnswers is a fully-optional bag of loosely-typed bracket
// strings/arrays — validate shape-agnostically and let normalizeProfile do
// the real interpretation.
const onboardingAnswersSchema = z.record(z.string(), z.unknown());

function hashProfile(profile: NormalizedProfile): string {
  return crypto.createHash("sha256").update(JSON.stringify(profile)).digest("hex");
}

/**
 * The ONE automatic Gemini request that fires after Stage 7. A single
 * generateIntelligencePackage call returns the founder's synthesis plus
 * all 3 opportunities — each already carrying its complete detail and its
 * complete roadmap — replacing what used to be a founder-analysis call
 * plus a candidate-generation call plus (lazily, later) up to 3 detail
 * calls plus up to 3 roadmap calls. Everything after generation —
 * deterministic fit scoring, ranking, and every database write — is plain
 * application code; no second model call happens here under any
 * circumstance. Only the deterministic top scorer's roadmap is marked
 * active; the other two are pre-built and ready, so switching between the
 * initial 3 opportunities later costs zero further Gemini calls.
 */
export const completeConsultation = createServerFn({ method: "POST" })
  .validator(z.object({ answers: onboardingAnswersSchema }))
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser();
    const answers = data.answers as Parameters<typeof normalizeProfile>[0];
    const normalized = normalizeProfile(answers);
    const profileHash = hashProfile(normalized);

    const overallStart = Date.now();
    const pkg = await generateIntelligencePackage(normalized);
    const durationMs = Date.now() - overallStart;

    // generateStructured's own validation retry is internal and opaque
    // (no callback surfaces whether it fired) — a call that returns at all
    // counts as 1 request here for telemetry purposes (item 74); a retry
    // only ever costs latency, never a second row in this counter.
    const initialAiCalls = 1;
    console.info(
      `[intelligence-package] model=${MODEL} calls=${initialAiCalls} duration=${durationMs}ms user=${user.id}`,
    );

    const { data: dnaRow, error: dnaError } = await supabase
      .from("business_dna")
      .insert({
        user_id: user.id,
        onboarding_answers: answers as unknown as Json,
        normalized_signals: normalized as unknown as Json,
        founder_analysis: pkg.founderDNA as unknown as Json,
        ai_model: MODEL,
        profile_hash: profileHash,
        initial_ai_calls: initialAiCalls,
        generation_duration_ms: durationMs,
        prompt_version: "intelligence-package-v1",
      })
      .select("id")
      .single();
    if (dnaError || !dnaRow) throw new Error(dnaError?.message ?? "Failed to save Business DNA");

    const scored = pkg.opportunities
      .map((opp) => ({ opp, score: computeFitScore(normalized, opp.fitSignals) }))
      .sort((a, b) => b.score.total - a.score.total);

    for (let i = 0; i < scored.length; i++) {
      const { opp, score } = scored[i];
      const { data: oppRow, error: oppError } = await supabase
        .from("opportunities")
        .insert({
          user_id: user.id,
          business_dna_id: dnaRow.id,
          title: opp.title,
          one_liner: opp.plainEnglishSummary,
          who_for: opp.customer,
          fit_score: score.total,
          score_breakdown: score as unknown as Json,
          candidate: opp as unknown as Json,
          status: "active",
          batch_number: 1,
          ai_model: MODEL,
        })
        .select("id")
        .single();
      if (oppError || !oppRow) throw new Error(oppError?.message ?? "Failed to save opportunity");

      // Detail is folded directly into `candidate` now, but also mirrored
      // here so getOpportunity's existing "read opportunity_details, fall
      // back to lazy generation" path finds it immediately for every new
      // opportunity — the lazy-generation branch only ever fires for
      // pre-migration rows now.
      const { error: detailError } = await supabase.from("opportunity_details").insert({
        opportunity_id: oppRow.id,
        user_id: user.id,
        detail: opp as unknown as Json,
        ai_model: MODEL,
      });
      if (detailError) throw new Error(detailError.message);

      await createRoadmap(
        supabase,
        user.id,
        oppRow.id,
        opp.roadmap,
        i === 0 ? "active" : "available",
      );
    }

    if (user.email) void sendRoadmapReadyEmail(user.email, scored[0].opp.title);

    return { businessDnaId: dnaRow.id as string, founderDNA: pkg.founderDNA };
  });

export const getLatestBusinessDna = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("business_dna")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
});
