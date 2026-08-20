import { generateStructured } from "@/lib/ai/gemini.server";
import {
  SolventiaIntelligencePackageSchema,
  OpportunityPackageBatchSchema,
  type SolventiaIntelligencePackage,
  type OpportunityPackageBatch,
} from "@/lib/ai/schemas";
import { formatProfileForPrompt, PLAIN_LANGUAGE_RULE } from "@/lib/ai/prompts/shared";
import type { NormalizedProfile } from "@/lib/profile/normalize";

const ROADMAP_RULE = `Every opportunity's roadmap must be genuinely useful to someone who may know NOTHING about entrepreneurship — never generic advice like "research the market" or "build an MVP" or "launch your business". Use only the phases that genuinely apply (from: understand, explore, validate, build, launch, improve) — a tutoring service and a manufacturing business should not get identical roadmaps. If the founder lacks a skill a task needs, insert a short learning task BEFORE it — never assume competence not in their profile. Keep each phase to 2-4 tasks. Every task needs what/why/how/resource/timeEstimate/deadlineDaysFromStart/doneWhen/required/dependsOn. deadlineDaysFromStart must reflect this founder's real weekly hours — never compress a 40-hour task load into one week for someone with 5 hours/week. Never use unexplained startup vocabulary (MVP, GTM, B2B, CAC, LTV, TAM, ICP, funnel, churn, PMF) — if a term is genuinely needed, explain it in plain words the same sentence.`;

const SYSTEM_INSTRUCTION = `You are Sol, Solventia's business strategist. You turn ONE founder's real, complete profile into their complete initial workspace in a single response: an honest synthesis of who they are, and exactly three genuinely different, personalized business opportunities — each with its full detail AND its full execution roadmap already built. ${PLAIN_LANGUAGE_RULE} ${ROADMAP_RULE} Two founders with different profiles must never receive the same opportunities for the same reasons. Provide fitSignals as your honest, realistic estimate of what each opportunity actually requires — these drive a deterministic fit score computed by the application, so be realistic, never optimistic, and never invent a numeric score yourself.`;

/**
 * The ONE automatic Gemini request that fires after Stage 7 — replaces the
 * old analyzeFounder + generateOpportunityCandidates + per-opportunity
 * generateOpportunityDetail + per-opportunity generateRoadmapPlan chain
 * (previously up to 1 + 1 + 3 + 3 = 8 calls for a fully-explored first
 * session) with exactly one structured request. Everything downstream —
 * fit scoring, ranking, constraint warnings, persistence — is deterministic
 * application code, never a second model call.
 */
export async function generateIntelligencePackage(
  profile: NormalizedProfile,
): Promise<SolventiaIntelligencePackage> {
  const prompt = `Founder profile:\n${formatProfileForPrompt(profile)}

Produce this founder's complete initial Solventia workspace in one response:

1. founderDNA — a concise, honest synthesis (not a restatement of every answer). strategicSignals must be insights that only emerge from COMBINING multiple answers together, not a single fact repeated.

2. Exactly 3 opportunities — genuinely different strategic options (never the same idea worded three ways), each grounded in this founder's real skills, resources, time, risk tolerance, motivation, and constraints. Never suggest anything that conflicts with a stated constraint. Each "whyThisFounder" reason must cite a specific real signal from their profile, not a generic trait. Each opportunity needs its own complete roadmap already built (see roadmap rules).`;

  return generateStructured(SolventiaIntelligencePackageSchema, {
    systemInstruction: SYSTEM_INSTRUCTION,
    prompt,
  });
}

const EXPLORE_SYSTEM_INSTRUCTION = `You are Sol, Solventia's business strategist. The founder wants to see different opportunities than the ones already shown. ${PLAIN_LANGUAGE_RULE} ${ROADMAP_RULE} Each new opportunity needs its own complete detail AND complete roadmap already built, exactly like the original set — never a lighter-weight placeholder.`;

interface ExploreMoreOptions {
  excludeTitles: string[];
  dismissedNotes: string[];
  count: number;
}

/** The one explicit, user-triggered Gemini call behind "Explore More
 * Opportunities" (item 3/64) — founder DNA isn't regenerated since the
 * profile hasn't changed, but each new opportunity still gets its full
 * detail + roadmap up front so switching to one is zero more calls. */
export async function generateOpportunityPackageBatch(
  profile: NormalizedProfile,
  options: ExploreMoreOptions,
): Promise<OpportunityPackageBatch> {
  const exclusion =
    options.excludeTitles.length > 0
      ? `\n\nDo NOT repeat or lightly reword any of these already-shown ideas: ${options.excludeTitles.join(", ")}.`
      : "";
  const feedback =
    options.dismissedNotes.length > 0
      ? `\n\nThe founder gave this feedback on past ideas — steer away from what it implies: ${options.dismissedNotes.join("; ")}.`
      : "";

  const prompt = `Founder profile:\n${formatProfileForPrompt(profile)}${exclusion}${feedback}

Generate ${options.count} new, distinct business opportunity candidates for THIS founder, each with complete detail and a complete roadmap already built.`;

  return generateStructured(OpportunityPackageBatchSchema, {
    systemInstruction: EXPLORE_SYSTEM_INSTRUCTION,
    prompt,
  });
}
