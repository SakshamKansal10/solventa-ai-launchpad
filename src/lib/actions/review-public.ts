import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";

import { normalizeProfile, type NormalizedProfile } from "@/lib/profile/normalize";
import { computeFitScore, type FitScoreBreakdown } from "@/lib/profile/scoring";
import { generateIntelligencePackage } from "@/lib/ai/prompts/intelligence-package";
import { researchMarketEvidence } from "@/lib/ai/prompts/market-research";
import { generateMentorReply } from "@/lib/ai/prompts/mentor";
import { getWhyReasons } from "@/lib/opportunity-display";
import { AIGenerationError } from "@/lib/ai/gemini.server";
import type {
  OpportunityPackage,
  MarketEvidenceItem,
  RoadmapPlan,
  MentorResponse,
  FounderDNA,
} from "@/lib/ai/schemas";

// ============================================================
// Fixed, clearly fictional reviewer identity — never a real user.
// ============================================================

export const PUBLIC_REVIEW_PROFILE_ANSWERS: Record<string, unknown> = {
  age: "21",
  country: "India",
  state: "Haryana",
  city: "Ambala",
  postalCode: "134003",
  currentStatus: "College Student",
  degree: "B.A.",
  major: "Economics",
  skills: [
    { name: "Public Speaking", level: "intermediate" },
    { name: "Graphic Design", level: "beginner" },
    { name: "Research", level: "intermediate" },
  ],
  investmentBudget: "₹10,000 – ₹50,000",
  timeAvailableWeekly: "10–20 hrs",
  riskAppetite: "Balanced",
  workLocation: "Remote",
  biggestMotivation:
    "I want to learn how to actually run a business, not just study it — something small and real I can point to.",
  goals: ["A future startup", "Learning entrepreneurship"],
  timeline: "6–12 months",
};

// ============================================================
// Rate limiting — best-effort, per-IP, in-memory. This does NOT survive a
// Workers isolate recycle and does not coordinate across regions/edges —
// it blunts casual repeated clicking and simple single-origin scripts, not
// a determined distributed abuser. Flagged explicitly in the review report
// rather than presented as a real defense.
// ============================================================

const lastRunByIp = new Map<string, number>();
const COOLDOWN_MS = 8000;

async function checkRateLimit(): Promise<void> {
  const ip = getRequestIP() ?? "unknown";
  const now = Date.now();
  const last = lastRunByIp.get(ip) ?? 0;
  if (now - last < COOLDOWN_MS) {
    throw new Error(
      `Please wait a few seconds before running this again (shared demo — this calls a real, rate-limited AI API).`,
    );
  }
  lastRunByIp.set(ip, now);
}

// ============================================================
// Telemetry (same shape as the internal /review tool)
// ============================================================

export interface PipelineStep {
  step: string;
  status: "success" | "error" | "skipped";
  durationMs: number;
  detail?: string;
  errorCategory?: string;
  cacheStatus?: "hit" | "miss" | "n/a";
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
  return { category: "UNKNOWN", detail: message };
}

async function timedStep<T>(
  telemetry: PipelineStep[],
  step: string,
  fn: () => Promise<T>,
  cacheStatus?: "hit" | "miss",
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    telemetry.push({
      step,
      status: "success",
      durationMs: Math.round(performance.now() - start),
      cacheStatus,
    });
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
// Main analysis run — normalize → founder analysis → opportunity
// generation → scoring → ranking → ephemeral hold. Nothing here is
// persisted to Supabase; the result lives only in this response and, on
// the client, in React state for the duration of the page view.
// ============================================================

export interface OpportunityDiagnostic {
  title: string;
  oneLiner: string;
  category: string;
  fitScore: number;
  breakdown: FitScoreBreakdown;
  whyYou: string[];
  candidate: OpportunityPackage;
}

export interface PublicRunResult {
  telemetry: PipelineStep[];
  totalDurationMs: number;
  normalizedProfile: NormalizedProfile | null;
  founderAnalysis: FounderDNA | null;
  opportunities: OpportunityDiagnostic[];
  failed: boolean;
  failureStep: string | null;
}

/** ONE Gemini call produces founder DNA + all 3 opportunities, each
 * already carrying its full detail AND full roadmap — the same
 * intelligence-package pipeline the real /consultation flow uses. Nothing
 * here is persisted to Supabase; the result lives only in this response
 * and, on the client, in React state for the duration of the page view. */
async function runAnalysisCore(answersRaw: Record<string, unknown>): Promise<PublicRunResult> {
  const telemetry: PipelineStep[] = [];
  const overallStart = performance.now();
  const answers = answersRaw as Parameters<typeof normalizeProfile>[0];

  try {
    const profile = await timedStep(telemetry, "Profile normalization", async () =>
      normalizeProfile(answers),
    );

    const pkg = await timedStep(telemetry, "Gemini — intelligence package (1 call)", async () =>
      generateIntelligencePackage(profile),
    );

    const scored = await timedStep(telemetry, "Fit scoring", async () =>
      pkg.opportunities
        .map((c) => ({ candidate: c, score: computeFitScore(profile, c.fitSignals) }))
        .sort((a, b) => b.score.total - a.score.total),
    );

    await timedStep(telemetry, "Ranking", async () => scored.map((s) => s.candidate.title));

    await timedStep(telemetry, "Ephemeral hold (no database write)", async () => {
      // Intentional no-op — this route never writes to Supabase. Timed and
      // shown as its own step so the diagnostics panel is honest about
      // what "persistence" means here: nothing durable, nothing shared.
      return true;
    });

    const opportunities: OpportunityDiagnostic[] = scored.map(({ candidate, score }) => ({
      title: candidate.title,
      oneLiner: candidate.plainEnglishSummary,
      category: candidate.category,
      fitScore: score.total,
      breakdown: score.breakdown,
      whyYou: getWhyReasons(candidate),
      candidate,
    }));

    return {
      telemetry,
      totalDurationMs: Math.round(performance.now() - overallStart),
      normalizedProfile: profile,
      founderAnalysis: pkg.founderDNA,
      opportunities,
      failed: false,
      failureStep: null,
    };
  } catch (err) {
    const failedStep = telemetry.find((t) => t.status === "error");
    console.error("[review-public] pipeline failed:", err);
    return {
      telemetry,
      totalDurationMs: Math.round(performance.now() - overallStart),
      normalizedProfile: null,
      founderAnalysis: null,
      opportunities: [],
      failed: true,
      failureStep: failedStep?.step ?? "unknown",
    };
  }
}

export const runPublicAnalysis = createServerFn({ method: "POST" }).handler(async () => {
  await checkRateLimit();
  return runAnalysisCore(PUBLIC_REVIEW_PROFILE_ANSWERS);
});

// ============================================================
// Market research — on demand, per opportunity, matching how the real app
// only researches an opportunity once its detail page is actually opened.
// Cached in-memory (not the real shared research_cache table, which
// requires an authenticated role under RLS — unavailable here by design).
// ============================================================

const publicResearchCache = new Map<string, { items: MarketEvidenceItem[]; cachedAt: number }>();
const RESEARCH_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes, in-memory only

export interface PublicMarketResult {
  telemetry: PipelineStep[];
  items: MarketEvidenceItem[];
  failed: boolean;
}

export const runPublicMarketResearch = createServerFn({ method: "POST" })
  .validator(z.object({ title: z.string(), oneLiner: z.string(), category: z.string() }))
  .handler(async ({ data }): Promise<PublicMarketResult> => {
    await checkRateLimit();
    const telemetry: PipelineStep[] = [];
    const cacheKey = `${data.category.toLowerCase()}::${data.title.toLowerCase()}`;
    const cached = publicResearchCache.get(cacheKey);

    if (cached && Date.now() - cached.cachedAt < RESEARCH_CACHE_TTL_MS) {
      telemetry.push({
        step: "Market research",
        status: "success",
        durationMs: 0,
        cacheStatus: "hit",
      });
      return { telemetry, items: cached.items, failed: false };
    }

    try {
      const items = await timedStep(
        telemetry,
        "Market research",
        async () => researchMarketEvidence(data.title, data.oneLiner, data.category),
        "miss",
      );
      publicResearchCache.set(cacheKey, { items, cachedAt: Date.now() });
      return { telemetry, items, failed: false };
    } catch (err) {
      console.error("[review-public] market research failed:", err);
      return { telemetry, items: [], failed: true };
    }
  });

// ============================================================
// Roadmap — the one-call architecture means this needs ZERO further Gemini
// calls: the candidate handed back from runPublicAnalysis already carries
// its complete roadmap. This "action" exists only so the diagnostics
// panel can show a real, timed (near-instant) step confirming that, the
// same way the real dashboard's opportunity-switching costs zero calls.
// ============================================================

export interface PublicRoadmapResult {
  telemetry: PipelineStep[];
  detail: OpportunityPackage | null;
  plan: RoadmapPlan | null;
  failed: boolean;
  failureStep: string | null;
}

export const runPublicRoadmap = createServerFn({ method: "POST" })
  .validator(z.object({ candidate: z.custom<OpportunityPackage>() }))
  .handler(async ({ data }): Promise<PublicRoadmapResult> => {
    const telemetry: PipelineStep[] = [];
    await timedStep(telemetry, "Read pre-built roadmap (0 Gemini calls)", async () => true);
    return {
      telemetry,
      detail: data.candidate,
      plan: data.candidate.roadmap,
      failed: false,
      failureStep: null,
    };
  });

// ============================================================
// Sol mentor — stateless, on demand. No conversation is persisted.
// ============================================================

export const runPublicMentorReply = createServerFn({ method: "POST" })
  .validator(
    z.object({
      message: z.string().min(1).max(2000),
      opportunityTitle: z.string().nullable(),
      history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })),
    }),
  )
  .handler(async ({ data }): Promise<{ reply: MentorResponse | null; failed: boolean }> => {
    await checkRateLimit();
    const profile = normalizeProfile(
      PUBLIC_REVIEW_PROFILE_ANSWERS as Parameters<typeof normalizeProfile>[0],
    );
    try {
      const reply = await generateMentorReply(
        {
          profile,
          opportunityTitle: data.opportunityTitle,
          currentPhase: null,
          recentHistory: data.history,
        },
        data.message,
      );
      return { reply, failed: false };
    } catch (err) {
      console.error("[review-public] mentor reply failed:", err);
      return { reply: null, failed: true };
    }
  });

// ============================================================
// Two-profile personalization test — same profiles as the internal
// reviewer tool, run sequentially (measured elsewhere in this codebase:
// concurrent Gemini calls are ~3x slower on this key's quota, not faster).
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

export interface PublicTwoProfileResult {
  profileA: PublicRunResult;
  profileB: PublicRunResult;
  profileAFirstAction: string | null;
  profileBFirstAction: string | null;
  personalizationPassed: boolean;
  reason: string;
}

/** Each profile's top opportunity already carries its complete roadmap
 * (the one-call architecture) — no further Gemini call needed to show its
 * first action, just a read of already-generated data. */
function getFirstRoadmapAction(candidate: OpportunityPackage | undefined): string | null {
  return candidate?.roadmap.phases[0]?.tasks[0]?.what ?? null;
}

export const runPublicTwoProfileTest = createServerFn({ method: "POST" }).handler(
  async (): Promise<PublicTwoProfileResult> => {
    await checkRateLimit();
    // Sequential, not concurrent — measured elsewhere in this codebase that
    // concurrent Gemini calls on this key's quota are ~3x slower, not faster.
    const profileA = await runAnalysisCore(PROFILE_A);
    const profileB = await runAnalysisCore(PROFILE_B);

    if (profileA.failed || profileB.failed) {
      return {
        profileA,
        profileB,
        profileAFirstAction: null,
        profileBFirstAction: null,
        personalizationPassed: false,
        reason: "One or both runs failed — see telemetry for the failing step.",
      };
    }

    const topA = profileA.opportunities[0];
    const topB = profileB.opportunities[0];
    const sameTitle = topA?.title === topB?.title;
    const sameScore = topA?.fitScore === topB?.fitScore;

    const profileAFirstAction = getFirstRoadmapAction(topA?.candidate);
    const profileBFirstAction = getFirstRoadmapAction(topB?.candidate);

    return {
      profileA,
      profileB,
      profileAFirstAction,
      profileBFirstAction,
      personalizationPassed: !sameTitle && !sameScore,
      reason:
        sameTitle || sameScore
          ? `PERSONALIZATION FAILURE: identical ${sameTitle ? "top opportunity title" : ""}${sameTitle && sameScore ? " and " : ""}${sameScore ? "fit score" : ""} for two deliberately opposite profiles.`
          : `Top opportunities differ ("${topA?.title}" vs "${topB?.title}"), scores differ (${topA?.fitScore} vs ${topB?.fitScore}).`,
    };
  },
);
