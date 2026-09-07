import { z } from "zod";

import { generateJSON, AIGenerationError } from "@/lib/ai/gemini.server";
import { env } from "@/lib/env.server";
import {
  FounderDNASchema,
  FitFactorsSchema,
  type SolventiaIntelligencePackage,
  type OpportunityPackage,
  type OpportunityPackageBatch,
} from "@/lib/ai/schemas";
import { formatProfileForPrompt, PLAIN_LANGUAGE_RULE } from "@/lib/ai/prompts/shared";
import type { NormalizedProfile } from "@/lib/profile/normalize";

// ============================================================
// IDEAS ONLY — no roadmap.
//
// This module used to generate 3 opportunities AND 3 full roadmap trees in
// one response; nesting three complete roadmaps empirically hit Gemini's
// structured-output complexity ceiling twice (live 400 INVALID_ARGUMENT,
// even after shrinking the roadmap arrays twice). Roadmap generation has
// since moved out entirely, into roadmap-generation.ts's generateRoadmapPlan
// — a separate, on-demand Gemini call for exactly ONE opportunity, made
// only after the founder explicitly selects it and clicks "Build My
// Roadmap". That split is what actually fixed the complexity problem: this
// module's response is now just founder DNA + 3 opportunity descriptions,
// well under the ceiling that only ever showed up around nested roadmaps.
//
// The response Gemini returns is still flat (opportunityIndex-tagged)
// rather than a bare array, purely so the model can't silently return
// fewer/more than 3 or duplicate an index — Zod's superRefine below catches
// that immediately. reconstructPackage() below just drops the index and
// returns the app-facing SolventiaIntelligencePackage shape (its
// `roadmap` field is optional and simply absent here — see schemas.ts).
// ============================================================

const FlatOpportunitySchema = z.object({
  opportunityIndex: z
    .number()
    .int()
    .min(0)
    .max(2)
    .describe("0, 1, or 2 — must be unique per opportunity."),
  title: z.string().describe("Short, concrete name for the opportunity."),
  category: z
    .string()
    .describe("e.g. local service, digital service, product, content — plain words."),
  plainEnglishSummary: z.string().describe("1-2 sentences: what is it, no jargon."),
  customer: z.string().describe("Who specifically would pay for this."),
  problem: z.string().describe("The real problem this solves, plainly."),
  solution: z.string().describe("How this opportunity solves that problem, plainly."),
  whyThisFounder: z
    .array(z.string())
    .length(3)
    .describe(
      "Exactly three specific reasons this fits THIS founder, referencing their actual profile.",
    ),
  businessModelPlainEnglish: z
    .string()
    .describe("Plain-language explanation of how this makes money."),
  startingCapital: z
    .string()
    .describe(
      "Realistic starting range in plain words, in the founder's own currency given in the prompt — never default to rupees for a non-Indian founder.",
    ),
  weeklyTime: z.string().describe("Realistic weekly time commitment in plain words."),
  difficulty: z
    .enum(["Beginner-friendly", "Moderate", "Challenging"])
    .describe("Honest difficulty for THIS founder given their real skills/experience."),
  skillsAlreadyOwned: z.array(z.string()).max(5),
  skillsToLearn: z.array(z.string()).max(5),
  resourceRequirements: z
    .array(z.string())
    .max(4)
    .describe("Concrete equipment/tools/accounts needed to start."),
  advantages: z.array(z.string()).min(2).max(4),
  tradeoffs: z.array(z.string()).min(1).max(4),
  risks: z.array(z.string()).min(1).max(4).describe("What can realistically go wrong."),
  unknowns: z.array(z.string()).max(3).describe("Open questions not yet answered."),
  validationNeeded: z
    .array(z.string())
    .max(3)
    .describe("What must be tested before committing real time/money."),
  revenuePath: z
    .string()
    .describe("How revenue realistically grows from the first customer onward."),
  firstExperiment: z
    .string()
    .describe(
      "One concrete, low-cost, doable-this-week action to test the idea — specific, never 'validate the market'.",
    ),
  whyNow: z
    .string()
    .describe(
      "One honest sentence on why this is a good time for THIS founder to pursue this — a real timing signal, never generic hype.",
    ),
  fitSignals: FitFactorsSchema,
});
type FlatOpportunity = z.infer<typeof FlatOpportunitySchema>;

/** Exported only so a test can assert on the exact request shape sent to
 * Gemini without spending a live API call. */
export const FlatIntelligencePackageSchema = z
  .object({
    founderDNA: FounderDNASchema,
    opportunities: z
      .array(FlatOpportunitySchema)
      .length(3)
      .describe(
        "Exactly 3 genuinely different strategic options — never near-duplicates of the same idea.",
      ),
  })
  .superRefine((pkg, ctx) => {
    const opportunityIndexes = pkg.opportunities.map((o) => o.opportunityIndex);
    const uniqueIndexes = new Set(opportunityIndexes);
    if (uniqueIndexes.size !== 3 || ![0, 1, 2].every((i) => uniqueIndexes.has(i))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `opportunities must have exactly the indexes 0, 1, 2 (each once) — got [${opportunityIndexes.join(", ")}].`,
      });
    }
  });
type FlatIntelligencePackage = z.infer<typeof FlatIntelligencePackageSchema>;

function reconstructOpportunity(flatOpp: FlatOpportunity): OpportunityPackage {
  const { opportunityIndex, ...rest } = flatOpp;
  return rest;
}

function reconstructPackage(flat: FlatIntelligencePackage): SolventiaIntelligencePackage {
  return {
    founderDNA: flat.founderDNA,
    opportunities: flat.opportunities
      .slice()
      .sort((a, b) => a.opportunityIndex - b.opportunityIndex)
      .map(reconstructOpportunity),
  };
}

/** Exported only for diagnostic scripts to reuse the exact real string
 * without transcription risk — see scripts/_step4-diagnostic.ts. */
export const SYSTEM_INSTRUCTION = `You are Sol, Solventia's business strategist. You turn ONE founder's real, complete profile into an honest synthesis of who they are, plus exactly three genuinely different, personalized business opportunities. ${PLAIN_LANGUAGE_RULE} Follow this pipeline: extract the founder's hard constraints (location, capital, time, skills, education, risk tolerance, income/family support) — never suggest anything that violates one of these. Then note their soft preferences (interests, personality, goals, preferred work style). Generate multiple candidate opportunity spaces, silently reject any that are unrealistic for this specific founder, then keep exactly the three strongest, genuinely different options and rank them — you don't need to say which is strongest, the application ranks them deterministically from fitSignals. Two founders with different profiles must never receive the same opportunities for the same reasons. Provide fitSignals as your honest, realistic estimate of what each opportunity actually requires — these drive a deterministic fit score computed by the application, so be realistic, never optimistic, and never invent a numeric score yourself. Ideas must be practical for a beginner to actually start, never vague startup jargon. CURRENCY: the founder profile states their exact currency (ISO code and symbol) — every monetary value you produce (startingCapital text, startupCapitalAmount number, any cost/price/revenue figure anywhere) MUST be in that currency, at a realistic magnitude and cost-of-living for the founder's actual country and city. Never default to Indian Rupees or lakh/crore phrasing unless the founder's currency is genuinely INR. Never invent an exchange rate or mention any currency other than the founder's own.`;

const OPPORTUNITY_CONTRACT = `{
    "opportunityIndex": integer (unique within this response), "title": string, "category": string, "plainEnglishSummary": string, "customer": string, "problem": string, "solution": string,
    "whyThisFounder": string[exactly 3], "businessModelPlainEnglish": string, "startingCapital": string, "weeklyTime": string,
    "difficulty": "Beginner-friendly"|"Moderate"|"Challenging", "skillsAlreadyOwned": string[0-5], "skillsToLearn": string[0-5], "resourceRequirements": string[0-4],
    "advantages": string[2-4], "tradeoffs": string[1-4], "risks": string[1-4], "unknowns": string[0-3], "validationNeeded": string[0-3], "revenuePath": string, "firstExperiment": string, "whyNow": string,
    "fitSignals": { "requiredSkills": [{"name": string, "minLevel": "never_tried"|"beginner"|"comfortable"|"advanced"}], "startupCapitalAmount": number, "weeklyHoursNeeded": number,
      "riskLevel": "cautious"|"balanced"|"experimental", "motivationAlignment": "high"|"medium"|"low", "requiresLeadership": boolean, "requiresSales": boolean, "soloFriendly": boolean,
      "relevantExperienceYears": number, "requiresDigitalAssets": boolean, "locationFlexible": boolean }
  }`;

const IDEA_PACKAGE_JSON_CONTRACT = `{
  "founderDNA": { "narrativeSummary": string, "strengths": string[2-5], "resources": string[1-5], "constraints": string[1-5], "workStyle": string, "riskProfile": string, "direction": string, "strategicSignals": string[1-4] },
  "opportunities": [ exactly 3 objects, opportunityIndex 0|1|2, each: ${OPPORTUNITY_CONTRACT} ]
}`;

/**
 * The ONE automatic Gemini request that fires after Stage 7 — founder DNA
 * plus exactly 3 opportunity ideas (no roadmap). Roadmap generation is a
 * separate, later, user-triggered call (see roadmap-generation.ts).
 */
export async function generateIntelligencePackage(
  profile: NormalizedProfile,
): Promise<SolventiaIntelligencePackage> {
  const prompt = `Founder profile:\n${formatProfileForPrompt(profile)}

Produce this founder's initial Solventia workspace in one response:

1. founderDNA — a concise, honest synthesis (not a restatement of every answer). strategicSignals must be insights that only emerge from COMBINING multiple answers together, not a single fact repeated.

2. Exactly 3 opportunities (opportunityIndex 0, 1, 2) — genuinely different strategic options (never the same idea worded three ways), each grounded in this founder's real skills, resources, time, risk tolerance, motivation, and constraints. Never suggest anything that conflicts with a stated constraint. Each "whyThisFounder" reason must cite a specific real signal from their profile, not a generic trait. "whyNow" must be a real, specific timing reason — never generic hype like "the market is booming".

Respond with ONLY a single JSON object — no markdown fences, no commentary before or after — matching this exact shape:
${IDEA_PACKAGE_JSON_CONTRACT}`;

  const flat = await generateJSON(FlatIntelligencePackageSchema, {
    systemInstruction: SYSTEM_INSTRUCTION,
    prompt,
    // The one-call architecture guarantees exactly one automatic Gemini
    // request per initial analysis — an invalid response here must fail
    // immediately and surface a retry to the FOUNDER, not silently spend a
    // second request against the shared daily quota on their behalf.
    allowRetry: false,
    callSite: "generateIntelligencePackage",
    purpose: "INITIAL_INTELLIGENCE",
    route: "consultation/complete",
    thinkingLevel: env.INITIAL_AI_THINKING_LEVEL,
  });

  return reconstructPackage(flat);
}

// ============================================================
// Explore More — same flat-index-tagging approach, smaller scale (no
// founder DNA to regenerate, 1-4 opportunities instead of always 3). Also
// ideas-only now: an explored opportunity gets a roadmap only if/when the
// founder selects it and clicks "Build My Roadmap", same as the original 3.
// ============================================================

const FlatExploreOpportunitySchema = FlatOpportunitySchema.extend({
  opportunityIndex: z.number().int().min(0).max(3),
});
type FlatExploreOpportunity = z.infer<typeof FlatExploreOpportunitySchema>;

function makeFlatExploreSchema(count: number) {
  const indexes = Array.from({ length: count }, (_, i) => i);
  return z
    .object({
      opportunities: z.array(FlatExploreOpportunitySchema).length(count),
    })
    .superRefine((pkg, ctx) => {
      const got = new Set(pkg.opportunities.map((o) => o.opportunityIndex));
      if (got.size !== count || !indexes.every((i) => got.has(i))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `opportunities must have exactly the indexes ${indexes.join(", ")} (each once).`,
        });
      }
    });
}

const EXPLORE_SYSTEM_INSTRUCTION = `You are Sol, Solventia's business strategist. The founder wants to see different opportunities than the ones already shown. ${PLAIN_LANGUAGE_RULE} Each new opportunity needs its own complete detail, exactly like the original set — never a lighter-weight placeholder. CURRENCY: every monetary value must be in the founder's own currency as stated in their profile — never default to Indian Rupees unless that's genuinely their currency.`;

interface ExploreMoreOptions {
  excludeTitles: string[];
  dismissedNotes: string[];
  count: number;
}

/** The one explicit, user-triggered Gemini call behind "Explore More
 * Opportunities" — founder DNA isn't regenerated since the profile hasn't
 * changed. No roadmap is generated here either; that only happens once the
 * founder selects one of these and builds its roadmap. */
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

  const flatSchema = makeFlatExploreSchema(options.count);
  const jsonContract = `{
  "opportunities": [ exactly ${options.count} objects, opportunityIndex 0${options.count > 1 ? `-${options.count - 1}` : ""}, each: ${OPPORTUNITY_CONTRACT} ]
}`;
  const prompt = `Founder profile:\n${formatProfileForPrompt(profile)}${exclusion}${feedback}

Generate ${options.count} new, distinct business opportunity candidates (opportunityIndex 0${options.count > 1 ? `-${options.count - 1}` : ""}) for THIS founder, each with complete detail.

Respond with ONLY a single JSON object — no markdown fences, no commentary before or after — matching this exact shape:
${jsonContract}`;

  const flat = await generateJSON(flatSchema, {
    systemInstruction: EXPLORE_SYSTEM_INSTRUCTION,
    prompt,
    callSite: "generateOpportunityPackageBatch",
    purpose: "EXPLORE_MORE",
    route: "dashboard/explore-more",
  });

  const opportunities: OpportunityPackage[] = (flat.opportunities as FlatExploreOpportunity[])
    .slice()
    .sort((a, b) => a.opportunityIndex - b.opportunityIndex)
    .map(reconstructOpportunity);

  if (opportunities.length === 0) {
    throw new AIGenerationError("Explore More returned zero opportunities after reconstruction.");
  }

  return { opportunities };
}
