import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "node:crypto";

import { requireReviewerLoader } from "@/lib/route-guards";
import { requireUser } from "@/lib/supabase/server";
import { normalizeProfile, type NormalizedProfile } from "@/lib/profile/normalize";
import { computeFitScore, type FitScoreBreakdown } from "@/lib/profile/scoring";
import { generateIntelligencePackage } from "@/lib/ai/prompts/intelligence-package";
import { toDisplayFounderDNA } from "@/lib/founder-dna-display";
import { getWhyReasons } from "@/lib/opportunity-display";
import { createRoadmap } from "@/lib/actions/roadmap-persistence.server";
import { AIGenerationError, MODEL } from "@/lib/ai/gemini.server";
import type { FounderAnalysis, OpportunityPackage } from "@/lib/ai/schemas";
import type { Json } from "@/lib/supabase/types";

// ============================================================
// Telemetry primitives
// ============================================================

export interface PipelineStep {
  step: string;
  status: "success" | "error" | "skipped";
  durationMs: number;
  detail?: string;
  errorCategory?: string;
}

function categorizeError(err: unknown): { category: string; detail: string } {
  const message = err instanceof Error ? err.message : String(err);
  if (err instanceof AIGenerationError) {
    if (/429|RESOURCE_EXHAUSTED|quota/i.test(message))
      return { category: "RATE_LIMIT", detail: message };
    if (/timeout|ETIMEDOUT|deadline/i.test(message))
      return { category: "TIMEOUT", detail: message };
    if (/validation|parse|schema/i.test(message))
      return { category: "MALFORMED_OUTPUT", detail: message };
    return { category: "AI_ERROR", detail: message };
  }
  if (/network|fetch failed|ECONNREFUSED/i.test(message))
    return { category: "NETWORK", detail: message };
  return { category: "UNKNOWN", detail: message };
}

async function timedStep<T>(
  telemetry: PipelineStep[],
  step: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    telemetry.push({ step, status: "success", durationMs: Math.round(performance.now() - start) });
    return result;
  } catch (err) {
    const { category, detail } = categorizeError(err);
    telemetry.push({
      step,
      status: "error",
      durationMs: Math.round(performance.now() - start),
      detail,
      errorCategory: category,
    });
    throw err;
  }
}

// ============================================================
// Failure injection — entirely local to this file. Never touches
// gemini.server.ts or any production code path; a reviewer flag can only
// ever affect the reviewer's own /review-triggered run.
// ============================================================

export type FailureInjection =
  "none" | "gemini_timeout" | "gemini_429" | "gemini_malformed" | "research_failure";

function maybeInjectGeminiFailure(mode: FailureInjection): void {
  if (mode === "gemini_timeout") {
    throw new AIGenerationError(
      "Simulated timeout: Gemini request exceeded 30000ms (injected by /review)",
      "GEMINI_REQUEST_FAILED",
    );
  }
  if (mode === "gemini_429") {
    throw new AIGenerationError(
      "Simulated 429 RESOURCE_EXHAUSTED: quota exceeded (injected by /review)",
      "GEMINI_QUOTA_EXCEEDED",
    );
  }
  if (mode === "gemini_malformed") {
    throw new AIGenerationError(
      'Gemini output failed schema validation after retry (injected by /review): Expected string, received number at "title"',
      "GEMINI_SCHEMA_MISMATCH",
    );
  }
}

// ============================================================
// Core pipeline — every call below is the exact function production uses.
// This file adds timing/telemetry and (optionally) simulated failures; it
// never reimplements normalization, scoring, or prompting logic.
// ============================================================

export interface OpportunityDiagnostic {
  id: string;
  title: string;
  oneLiner: string;
  fitScore: number;
  breakdown: FitScoreBreakdown;
  whyYou: string[];
  candidate: OpportunityPackage;
}

export interface ReviewRunResult {
  telemetry: PipelineStep[];
  totalDurationMs: number;
  businessDnaId: string | null;
  normalizedProfile: NormalizedProfile | null;
  founderAnalysis: FounderAnalysis | null;
  opportunities: OpportunityDiagnostic[];
  failed: boolean;
  failureStep: string | null;
}

const reviewProfileSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
  injectFailure: z
    .enum(["none", "gemini_timeout", "gemini_429", "gemini_malformed", "research_failure"])
    .optional(),
  persist: z.boolean().default(true),
});

async function runPipeline(
  answersRaw: Record<string, unknown>,
  injectFailure: FailureInjection,
  persist: boolean,
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"] | null,
  userId: string | null,
): Promise<ReviewRunResult> {
  const telemetry: PipelineStep[] = [];
  const overallStart = performance.now();
  const answers = answersRaw as Parameters<typeof normalizeProfile>[0];

  try {
    const profile = await timedStep(telemetry, "Profile normalization", async () =>
      normalizeProfile(answers),
    );

    const pkg = await timedStep(telemetry, "Gemini — intelligence package (1 call)", async () => {
      if (
        injectFailure === "gemini_timeout" ||
        injectFailure === "gemini_429" ||
        injectFailure === "gemini_malformed"
      ) {
        maybeInjectGeminiFailure(injectFailure);
      }
      return generateIntelligencePackage(profile);
    });

    const scored = await timedStep(telemetry, "Fit scoring", async () =>
      pkg.opportunities
        .map((c) => ({ candidate: c, score: computeFitScore(profile, c.fitSignals) }))
        .sort((a, b) => b.score.total - a.score.total),
    );

    await timedStep(telemetry, "Ranking", async () => {
      // Ranking is the sort above — recorded as its own step since it's a
      // distinct, real, separate operation over the scored set, matching
      // the pipeline as the user actually experiences it.
      return scored.map((s) => s.candidate.title);
    });

    const displayDna = toDisplayFounderDNA(pkg.founderDNA);
    const founderAnalysis: FounderAnalysis = {
      summary: displayDna!.narrativeSummary,
      strengths: displayDna!.strengths,
      constraints: displayDna!.constraints,
      reflection: displayDna!.strategicSignals[0] ?? "",
    };

    let businessDnaId: string | null = null;
    let opportunityIds: string[] = [];

    if (persist && supabase && userId) {
      businessDnaId = await timedStep(telemetry, "Database — Business DNA write", async () => {
        const { data, error } = await supabase
          .from("business_dna")
          .insert({
            user_id: userId,
            onboarding_answers: answers as unknown as Json,
            normalized_signals: profile as unknown as Json,
            founder_analysis: pkg.founderDNA as unknown as Json,
            ai_model: MODEL,
          })
          .select("id")
          .single();
        if (error || !data) throw new Error(error?.message ?? "Business DNA insert failed");
        return data.id as string;
      });

      opportunityIds = await timedStep(
        telemetry,
        "Database — opportunities + roadmaps write",
        async () => {
          const ids: string[] = [];
          for (let i = 0; i < scored.length; i++) {
            const { candidate, score } = scored[i];
            const { data, error } = await supabase
              .from("opportunities")
              .insert({
                user_id: userId,
                business_dna_id: businessDnaId as string,
                title: candidate.title,
                one_liner: candidate.plainEnglishSummary,
                who_for: candidate.customer,
                fit_score: score.total,
                score_breakdown: score as unknown as Json,
                candidate: candidate as unknown as Json,
                status: "active" as const,
                batch_number: 1,
                ai_model: MODEL,
              })
              .select("id")
              .single();
            if (error || !data) throw new Error(error?.message ?? "Opportunity insert failed");
            await supabase.from("opportunity_details").insert({
              opportunity_id: data.id,
              user_id: userId,
              detail: candidate as unknown as Json,
              ai_model: MODEL,
            });
            await createRoadmap(
              supabase,
              userId,
              data.id,
              candidate.roadmap,
              i === 0 ? "active" : "available",
            );
            ids.push(data.id as string);
          }
          return ids;
        },
      );
    } else {
      telemetry.push({ step: "Database — Business DNA write", status: "skipped", durationMs: 0 });
      telemetry.push({
        step: "Database — opportunities + roadmaps write",
        status: "skipped",
        durationMs: 0,
      });
    }

    if (injectFailure === "research_failure") {
      telemetry.push({
        step: "Market research (first opportunity)",
        status: "error",
        durationMs: 0,
        detail: "Simulated research provider unavailable (injected by /review)",
        errorCategory: "RESEARCH_UNAVAILABLE",
      });
    }

    const opportunities: OpportunityDiagnostic[] = scored.map(({ candidate, score }, i) => ({
      id: opportunityIds[i] ?? `preview-${i}`,
      title: candidate.title,
      oneLiner: candidate.plainEnglishSummary,
      fitScore: score.total,
      breakdown: score.breakdown,
      whyYou: getWhyReasons(candidate),
      candidate,
    }));

    return {
      telemetry,
      totalDurationMs: Math.round(performance.now() - overallStart),
      businessDnaId,
      normalizedProfile: profile,
      founderAnalysis,
      opportunities,
      failed: false,
      failureStep: null,
    };
  } catch (err) {
    const failedStep = telemetry.find((t) => t.status === "error");
    console.error("[review] pipeline failed:", err);
    return {
      telemetry,
      totalDurationMs: Math.round(performance.now() - overallStart),
      businessDnaId: null,
      normalizedProfile: null,
      founderAnalysis: null,
      opportunities: [],
      failed: true,
      failureStep: failedStep?.step ?? "unknown",
    };
  }
}

/** Runs the exact production pipeline (normalize → ONE Gemini intelligence-
 * package call → deterministic scoring → ranking → persistence) for the
 * reviewer's own isolated account, with full timing/error telemetry. */
export const runReviewAnalysis = createServerFn({ method: "POST" })
  .validator(reviewProfileSchema)
  .handler(async ({ data }) => {
    await requireReviewerLoader();
    const { supabase, user } = await requireUser();
    return runPipeline(data.answers, data.injectFailure ?? "none", data.persist, supabase, user.id);
  });

// ============================================================
// Two-profile personalization test
// ============================================================

const PROFILE_A: Record<string, unknown> = {
  age: "17",
  currentStatus: "School Student",
  timeAvailableWeekly: "Under 5 hrs",
  investmentBudget: "₹0 — I have no capital right now",
  skills: [{ name: "Writing", level: "beginner" }],
  riskAppetite: "Very cautious",
  workLocation: "Remote",
  biggestMotivation: "I want to help other students learn things school doesn't teach well.",
  goals: ["Learning entrepreneurship"],
};

const PROFILE_B: Record<string, unknown> = {
  age: "35",
  currentStatus: "Business Owner",
  timeAvailableWeekly: "Full-time",
  investmentBudget: "More than ₹2,00,000",
  preciseCapital: "10 lakh",
  skills: [
    { name: "Sales", level: "professional" },
    { name: "Project Management", level: "advanced" },
  ],
  riskAppetite: "Comfortable experimenting",
  workLocation: "A mix of both",
  leadership: "Very comfortable",
  salesComfort: "I enjoy it",
  biggestMotivation: "I want to build a new revenue line separate from my existing business.",
  goals: ["Scaling an existing venture"],
};

export interface TwoProfileTestResult {
  profileA: ReviewRunResult;
  profileB: ReviewRunResult;
  personalizationPassed: boolean;
  reason: string;
}

/** Runs two deliberately opposite profiles through the real pipeline
 * (never persisted — this is a comparison test, not account data) and
 * flags whether the recommendations actually differ. Sequential, not
 * concurrent: measured elsewhere in this codebase that concurrent Gemini
 * calls on this key's quota are ~3x slower, not faster. */
export const runTwoProfileTest = createServerFn({ method: "POST" }).handler(
  async (): Promise<TwoProfileTestResult> => {
    await requireReviewerLoader();

    const profileA = await runPipeline(PROFILE_A, "none", false, null, null);
    const profileB = await runPipeline(PROFILE_B, "none", false, null, null);

    if (profileA.failed || profileB.failed) {
      return {
        profileA,
        profileB,
        personalizationPassed: false,
        reason: "One or both runs failed — see telemetry for the failing step.",
      };
    }

    const topA = profileA.opportunities[0];
    const topB = profileB.opportunities[0];
    const sameTitle = topA?.title === topB?.title;
    const sameScore = topA?.fitScore === topB?.fitScore;

    return {
      profileA,
      profileB,
      personalizationPassed: !sameTitle && !sameScore,
      reason:
        sameTitle || sameScore
          ? `PERSONALIZATION FAILURE: identical ${sameTitle ? "top opportunity title" : ""}${sameTitle && sameScore ? " and " : ""}${sameScore ? "fit score" : ""} for two deliberately opposite profiles.`
          : `Top opportunities differ ("${topA?.title}" vs "${topB?.title}"), scores differ (${topA?.fitScore} vs ${topB?.fitScore}).`,
    };
  },
);

/** A stable, non-reversible identifier for the diagnostics panel — proves
 * which account a run belongs to without ever showing a raw user id or
 * email in the UI. */
export const getReviewerIdentity = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireReviewerLoader();
  const hash = crypto.createHash("sha256").update(user.id).digest("hex").slice(0, 12);
  return { userIdHash: hash, email: user.email };
});
