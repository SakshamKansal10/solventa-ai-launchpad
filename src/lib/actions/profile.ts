import crypto from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireUser } from "@/lib/supabase/server";
import { normalizeProfile, type NormalizedProfile } from "@/lib/profile/normalize";
import { computeFitScore } from "@/lib/profile/scoring";
import { computeFounderGenome } from "@/lib/profile/founder-genome";
import { computeAmbitionCalibration } from "@/lib/profile/ambition";
import { generateIntelligencePackage } from "@/lib/ai/prompts/intelligence-package";
import { MODEL, AIGenerationError } from "@/lib/ai/gemini.server";
import { sendIdeasReadyEmail } from "@/lib/actions/email.server";
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
 * all 3 opportunities with their complete detail — replacing what used to
 * be a founder-analysis call plus a candidate-generation call plus
 * (lazily, later) up to 3 detail calls. No roadmap is generated here: that
 * is a separate, on-demand Gemini call the founder triggers explicitly by
 * selecting one opportunity and clicking "Build My Roadmap" (see
 * buildRoadmapForOpportunity in roadmap.ts) — generating a roadmap for
 * all 3 ideas up front would spend 3x the roadmap-generation cost on 2
 * ideas the founder may never choose. Everything after generation here —
 * deterministic fit scoring, ranking, and every database write — is plain
 * application code; no second model call happens in this function under
 * any circumstance.
 */
export const completeConsultation = createServerFn({ method: "POST" })
  .validator(z.object({ answers: onboardingAnswersSchema }))
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser();
    const answers = data.answers as Parameters<typeof normalizeProfile>[0];
    const normalized = normalizeProfile(answers);
    const profileHash = hashProfile(normalized);

    // Cheap idempotency pre-check: a double-click, or the in-page submit
    // racing auth/callback's resumePendingConsultation, would otherwise
    // spend a second full Gemini generation (and create a duplicate
    // business_dna + opportunities + roadmaps row set) for the exact same
    // answers. This check alone isn't safe under true concurrency — two
    // requests can both pass it before either inserts — the unique index
    // on (user_id, profile_hash) below is the real guard for that; this is
    // just the fast path that avoids paying for a Gemini call in the
    // common (sequential) case.
    const { data: existingDna } = await supabase
      .from("business_dna")
      .select("id, founder_analysis")
      .eq("user_id", user.id)
      .eq("profile_hash", profileHash)
      .maybeSingle();
    if (existingDna) {
      return {
        businessDnaId: existingDna.id as string,
        founderDNA: existingDna.founder_analysis as unknown as Awaited<
          ReturnType<typeof generateIntelligencePackage>
        >["founderDNA"],
      };
    }

    // Deterministic, computed from the same normalized signals the
    // Founder Genome and Fit Score already read — never inferred by the
    // AI itself. Handed to it as scale-compatibility CONTEXT below, and
    // best-effort persisted onto business_dna after the row exists (see
    // the update after the insert) — never blocks consultation
    // completion if that persistence isn't available yet.
    const ambition = computeAmbitionCalibration(normalized, computeFounderGenome(normalized));

    const overallStart = Date.now();
    let pkg: Awaited<ReturnType<typeof generateIntelligencePackage>>;
    try {
      pkg = await generateIntelligencePackage(normalized, ambition);
    } catch (err) {
      // Dev-diagnostic detail only — the category never reaches the user,
      // who always sees the same calm "couldn't complete your analysis"
      // recovery screen regardless of which of these fired.
      const category = err instanceof AIGenerationError ? err.category : "GEMINI_REQUEST_FAILED";
      console.error(
        `[intelligence-package] generation failed model=${MODEL} category=${category} user=${user.id}:`,
        err,
      );
      throw err;
    }
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

    // 23505 = unique_violation on business_dna_user_profile_hash_key — the
    // true-concurrency case the pre-check above can't catch: another
    // request for this exact answer set won the race and already
    // committed. Converge on its row rather than surface an error after a
    // Gemini call that (in this one narrow case) turned out to be wasted.
    if (dnaError?.code === "23505") {
      const { data: winner, error: winnerError } = await supabase
        .from("business_dna")
        .select("id, founder_analysis")
        .eq("user_id", user.id)
        .eq("profile_hash", profileHash)
        .single();
      if (winnerError || !winner) {
        throw new Error(winnerError?.message ?? "Failed to load existing analysis");
      }
      return {
        businessDnaId: winner.id as string,
        founderDNA: winner.founder_analysis as unknown as typeof pkg.founderDNA,
      };
    }
    if (dnaError || !dnaRow) throw new Error(dnaError?.message ?? "Failed to save Business DNA");

    // Best-effort only — a separate update, not part of the insert above,
    // specifically so a founder on a database that hasn't had migration
    // 0006 applied yet still gets a complete, working consultation. The
    // ambition band already shaped THIS generation via the prompt above
    // regardless of whether this write succeeds; only its persistence
    // for later display/history depends on it.
    try {
      const { error: ambitionError } = await supabase
        .from("business_dna")
        .update({
          ambition_band: ambition.band,
          ambition_score: ambition.score,
          ambition_reason_codes: ambition.reasonCodes as unknown as Json,
          ambition_scoring_version: ambition.scoringVersion,
        })
        .eq("id", dnaRow.id);
      // Supabase returns { error } rather than throwing — e.g. if
      // migration 0006 hasn't been applied to this database yet, this
      // logs and moves on instead of failing the whole consultation.
      if (ambitionError) {
        console.error(
          "[profile] ambition calibration persistence failed (non-fatal):",
          ambitionError,
        );
      }
    } catch (err) {
      console.error("[profile] ambition calibration persistence threw (non-fatal):", err);
    }

    const scored = pkg.opportunities
      .map((opp) => ({ opp, score: computeFitScore(normalized, opp.fitSignals) }))
      .sort((a, b) => b.score.total - a.score.total);

    // Supabase's REST API gives each insert below its own transaction —
    // there's no ambient transaction spanning this loop. If opportunity #2
    // or #3 fails to persist, #1 (and business_dna) would otherwise stay
    // committed as an orphaned partial analysis, which is exactly the kind
    // of "half a dashboard" state the app must never show. On any failure
    // past this point, delete business_dna — FK cascades remove every
    // opportunity/detail/roadmap/phase/task written so far — and rethrow,
    // so the user always sees either a complete analysis or none at all.
    try {
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
      }
    } catch (err) {
      await supabase.from("business_dna").delete().eq("id", dnaRow.id);
      throw err;
    }

    if (user.email) void sendIdeasReadyEmail(user.email, scored[0].opp.title);

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

/**
 * Settings -> Founder Profile -> Edit [section]: patches a handful of
 * onboarding answer fields onto the founder's LATEST business_dna row IN
 * PLACE — no new row, no AI call, zero cost. This is what "Keep Current
 * Ideas" means concretely: current opportunities all still point at this
 * same business_dna_id, so they're completely unaffected; only the
 * founder's stored profile (and everything deterministic computed from
 * it — Founder Genome, Fit Score display, ambition band) reflects the
 * edit going forward. profile_hash is deliberately left untouched — it
 * only guards completeConsultation's full-submission idempotency, which
 * a single-field edit has nothing to do with.
 */
export const updateFounderProfileAnswers = createServerFn({ method: "POST" })
  .validator(z.object({ answers: z.record(z.string(), z.unknown()) }))
  .handler(async ({ data }) => {
    const { supabase, user } = await requireUser();
    const { data: latest, error: latestError } = await supabase
      .from("business_dna")
      .select("id, onboarding_answers")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) throw new Error(latestError.message);
    if (!latest) throw new Error("No consultation found to edit — complete one first.");

    const mergedAnswers = {
      ...(latest.onboarding_answers as Record<string, unknown>),
      ...data.answers,
    };
    const normalized = normalizeProfile(mergedAnswers as Parameters<typeof normalizeProfile>[0]);

    const { error: updateError } = await supabase
      .from("business_dna")
      .update({
        onboarding_answers: mergedAnswers as unknown as Json,
        normalized_signals: normalized as unknown as Json,
      })
      .eq("id", latest.id);
    if (updateError) throw new Error(updateError.message);

    return { businessDnaId: latest.id as string };
  });

/**
 * Settings -> "Your founder profile changed" banner -> "Re-analyze
 * Directions". Runs the exact same pipeline a fresh consultation submit
 * does (completeConsultation), seeded with the founder's current
 * (possibly just-edited) answers — a real new business_dna row, a real
 * new Gemini call, a real new opportunity set. Exactly like completing a
 * new consultation any other way, this NEVER touches or deletes the
 * founder's existing opportunities/roadmaps; they simply stop being the
 * default dashboard view (see getDashboard's "latest consultation" rule)
 * and remain reachable from Idea History.
 */
export const reanalyzeFromCurrentProfile = createServerFn({ method: "POST" }).handler(async () => {
  const { supabase, user } = await requireUser();
  const { data: latest, error } = await supabase
    .from("business_dna")
    .select("onboarding_answers")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!latest) throw new Error("No consultation found to re-analyze.");

  return completeConsultation({
    data: { answers: latest.onboarding_answers as Record<string, unknown> },
  });
});
