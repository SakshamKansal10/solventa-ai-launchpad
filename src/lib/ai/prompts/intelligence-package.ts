import { z } from "zod";

import {
  generateStructured,
  generateJSON,
  toGeminiSchema,
  AIGenerationError,
} from "@/lib/ai/gemini.server";
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
// GEMINI-FACING SHAPE vs. APPLICATION SHAPE
//
// schemas.ts's SolventiaIntelligencePackage/OpportunityPackage/RoadmapPlan
// nest opportunity -> roadmap -> phases -> tasks, which is the right shape
// for the rest of the app (persistence, UI types) — but sending that
// nesting depth to Gemini 3x over (one full roadmap tree per opportunity,
// in a single response) empirically hit Gemini's structured-output
// complexity ceiling twice in a row (live 400 INVALID_ARGUMENT, even
// after shrinking the roadmap arrays twice).
//
// The fix here is structural, not another size cut: the schema actually
// SENT to Gemini is flat — founder DNA, then three flat sibling arrays
// (opportunities / roadmapPhases / roadmapTasks) joined by small integer
// indices instead of nested objects-in-arrays-in-objects. A `.refine()`
// enforces the cross-reference integrity (every opportunityIndex has its
// phases, every phase has its tasks) as part of schema validation, so a
// malformed response triggers generateStructured's existing "retry once
// with the validation error fed back" path — no separate retry logic
// needed here.
//
// Everything OUTSIDE this file — profile.ts, opportunities.ts,
// roadmap-persistence.server.ts, review.ts, review-public.ts, every UI
// type — still sees the nested SolventiaIntelligencePackage shape
// unchanged. reconstructPackage() below is the only place the flat wire
// format ever exists; it's translated back to the nested shape before
// this module returns anything.
// ============================================================

const ROADMAP_PHASE_KEYS = [
  "understand",
  "explore",
  "validate",
  "build",
  "launch",
  "improve",
] as const;

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
    .describe("Realistic starting range in plain words, e.g. '₹5,000–15,000 to start'."),
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
  fitSignals: FitFactorsSchema,
});
type FlatOpportunity = z.infer<typeof FlatOpportunitySchema>;

const FlatRoadmapPhaseSchema = z.object({
  opportunityIndex: z.number().int().min(0).describe("Which opportunity this phase belongs to."),
  phaseIndex: z
    .number()
    .int()
    .min(0)
    .describe("Order within this opportunity's roadmap, starting at 0."),
  key: z
    .enum(ROADMAP_PHASE_KEYS)
    .describe("Only include phases that genuinely apply to this opportunity."),
  title: z.string(),
  description: z.string(),
});
type FlatRoadmapPhase = z.infer<typeof FlatRoadmapPhaseSchema>;

const FlatRoadmapTaskSchema = z.object({
  opportunityIndex: z.number().int().min(0).describe("Which opportunity this task belongs to."),
  phaseIndex: z
    .number()
    .int()
    .min(0)
    .describe("Which phase (within that opportunity) this task belongs to."),
  taskIndex: z.number().int().min(0).describe("Order within this phase, starting at 0."),
  what: z.string(),
  why: z.string(),
  how: z.string(),
  resource: z
    .string()
    .nullable()
    .describe("A specific, real, current learning resource if relevant."),
  timeEstimate: z.string().describe("e.g. '2-3 hours', '1 week'."),
  deadlineDaysFromStart: z
    .number()
    .min(0)
    .describe("Days from roadmap start this should be done by."),
  doneWhen: z.string().describe("A clear, measurable completion condition."),
  required: z
    .boolean()
    .describe("False for a genuinely optional/nice-to-have task, true otherwise."),
  dependsOn: z
    .string()
    .nullable()
    .describe(
      "The exact 'what' text of a prior task this depends on, or null if it can start independently.",
    ),
});
type FlatRoadmapTask = z.infer<typeof FlatRoadmapTaskSchema>;

/** 3-4 phases per opportunity, 2-3 tasks per phase — enforced by refine
 * below, not by nested array bounds, since there IS no nesting here. */
function validateRoadmapCoverage(
  opportunityIndexes: number[],
  phases: FlatRoadmapPhase[],
  tasks: FlatRoadmapTask[],
): boolean {
  for (const oi of opportunityIndexes) {
    const ownPhases = phases.filter((p) => p.opportunityIndex === oi);
    if (ownPhases.length < 3 || ownPhases.length > 4) return false;
    for (const phase of ownPhases) {
      const ownTasks = tasks.filter(
        (t) => t.opportunityIndex === oi && t.phaseIndex === phase.phaseIndex,
      );
      if (ownTasks.length < 2 || ownTasks.length > 3) return false;
    }
  }
  return true;
}

/** Exported only so a test can assert on the exact request shape sent to
 * Gemini without spending a live API call — see gemini-schema.test.ts. */
export const FlatIntelligencePackageSchema = z
  .object({
    founderDNA: FounderDNASchema,
    opportunities: z
      .array(FlatOpportunitySchema)
      .length(3)
      .describe(
        "Exactly 3 genuinely different strategic options — never near-duplicates of the same idea.",
      ),
    roadmapPhases: z
      .array(FlatRoadmapPhaseSchema)
      .min(9)
      .max(12)
      .describe(
        "3-4 phases per opportunity (9-12 total across all 3), tagged with opportunityIndex.",
      ),
    roadmapTasks: z
      .array(FlatRoadmapTaskSchema)
      .min(18)
      .max(36)
      .describe("2-3 tasks per phase, tagged with opportunityIndex + phaseIndex."),
  })
  .refine((pkg) => validateRoadmapCoverage([0, 1, 2], pkg.roadmapPhases, pkg.roadmapTasks), {
    message:
      "Every opportunityIndex (0, 1, 2) must have exactly 3-4 roadmapPhases entries, and every (opportunityIndex, phaseIndex) pair must have exactly 2-3 roadmapTasks entries.",
  });
type FlatIntelligencePackage = z.infer<typeof FlatIntelligencePackageSchema>;

function reconstructOpportunity(
  flatOpp: FlatOpportunity,
  phases: FlatRoadmapPhase[],
  tasks: FlatRoadmapTask[],
): OpportunityPackage {
  const { opportunityIndex, ...rest } = flatOpp;
  const ownPhases = phases
    .filter((p) => p.opportunityIndex === opportunityIndex)
    .sort((a, b) => a.phaseIndex - b.phaseIndex)
    .map((phase) => ({
      key: phase.key,
      title: phase.title,
      description: phase.description,
      tasks: tasks
        .filter((t) => t.opportunityIndex === opportunityIndex && t.phaseIndex === phase.phaseIndex)
        .sort((a, b) => a.taskIndex - b.taskIndex)
        .map((t) => ({
          what: t.what,
          why: t.why,
          how: t.how,
          resource: t.resource,
          timeEstimate: t.timeEstimate,
          deadlineDaysFromStart: t.deadlineDaysFromStart,
          doneWhen: t.doneWhen,
          required: t.required,
          dependsOn: t.dependsOn,
        })),
    }));

  return { ...rest, roadmap: { phases: ownPhases } };
}

function reconstructPackage(flat: FlatIntelligencePackage): SolventiaIntelligencePackage {
  return {
    founderDNA: flat.founderDNA,
    opportunities: flat.opportunities
      .slice()
      .sort((a, b) => a.opportunityIndex - b.opportunityIndex)
      .map((opp) => reconstructOpportunity(opp, flat.roadmapPhases, flat.roadmapTasks)),
  };
}

const ROADMAP_RULE = `Every opportunity's roadmap must be genuinely useful to someone who may know NOTHING about entrepreneurship — never generic advice like "research the market" or "build an MVP" or "launch your business". Use only the phases that genuinely apply (from: understand, explore, validate, build, launch, improve) — a tutoring service and a manufacturing business should not get identical roadmaps. If the founder lacks a skill a task needs, insert a short learning task BEFORE it — never assume competence not in their profile. Every task needs what/why/how/resource/timeEstimate/deadlineDaysFromStart/doneWhen/required/dependsOn. deadlineDaysFromStart must reflect this founder's real weekly hours — never compress a 40-hour task load into one week for someone with 5 hours/week. Never use unexplained startup vocabulary (MVP, GTM, B2B, CAC, LTV, TAM, ICP, funnel, churn, PMF) — if a term is genuinely needed, explain it in plain words the same sentence.`;

const FLAT_FORMAT_RULE = `Return roadmapPhases and roadmapTasks as FLAT arrays (not nested), using the opportunityIndex/phaseIndex/taskIndex fields described in the schema to tie each phase and task back to its opportunity.`;

const SYSTEM_INSTRUCTION = `You are Sol, Solventia's business strategist. You turn ONE founder's real, complete profile into their complete initial workspace in a single response: an honest synthesis of who they are, and exactly three genuinely different, personalized business opportunities — each with its full detail AND its full execution roadmap already built. ${PLAIN_LANGUAGE_RULE} ${ROADMAP_RULE} ${FLAT_FORMAT_RULE} Two founders with different profiles must never receive the same opportunities for the same reasons. Provide fitSignals as your honest, realistic estimate of what each opportunity actually requires — these drive a deterministic fit score computed by the application, so be realistic, never optimistic, and never invent a numeric score yourself.`;

/**
 * The ONE automatic Gemini request that fires after Stage 7 — replaces the
 * old analyzeFounder + generateOpportunityCandidates + per-opportunity
 * generateOpportunityDetail + per-opportunity generateRoadmapPlan chain
 * (previously up to 1 + 1 + 3 + 3 = 8 calls) with exactly one structured
 * request. The wire format Gemini actually returns is flat (see above);
 * this function reconstructs the nested shape every other caller expects
 * before returning. Everything downstream — fit scoring, ranking,
 * constraint warnings, persistence — is deterministic application code,
 * never a second model call.
 */
// The JSON contract Gemini must follow, derived straight from the same
// Zod schema (via toGeminiSchema) that validates the response — never
// hand-duplicated, so the prompt can never drift out of sync with what
// reconstructPackage()/Zod actually require. This travels in the PROMPT
// TEXT, not as a provider-side responseSchema: a schema this size (3
// opportunities × ~20 fields, plus 9-12 phases and 18-36 tasks) reliably
// trips Gemini's undocumented responseSchema complexity ceiling with a
// bare 400 INVALID_ARGUMENT — confirmed both by this project's own prior
// live 400s on an even smaller nested version, and independently by
// Google's own developer forum reporting the identical unresolved
// behavior as of January 2026. See generateJSON's doc comment.
const INTELLIGENCE_PACKAGE_JSON_CONTRACT = JSON.stringify(
  toGeminiSchema(FlatIntelligencePackageSchema),
);

export async function generateIntelligencePackage(
  profile: NormalizedProfile,
): Promise<SolventiaIntelligencePackage> {
  const prompt = `Founder profile:\n${formatProfileForPrompt(profile)}

Produce this founder's complete initial Solventia workspace in one response:

1. founderDNA — a concise, honest synthesis (not a restatement of every answer). strategicSignals must be insights that only emerge from COMBINING multiple answers together, not a single fact repeated.

2. Exactly 3 opportunities (opportunityIndex 0, 1, 2) — genuinely different strategic options (never the same idea worded three ways), each grounded in this founder's real skills, resources, time, risk tolerance, motivation, and constraints. Never suggest anything that conflicts with a stated constraint. Each "whyThisFounder" reason must cite a specific real signal from their profile, not a generic trait.

3. roadmapPhases and roadmapTasks — a complete roadmap per opportunity, per the flat array format.

Respond with ONLY a single JSON object — no markdown fences, no commentary before or after — that validates against this exact JSON Schema:
${INTELLIGENCE_PACKAGE_JSON_CONTRACT}`;

  const flat = await generateJSON(FlatIntelligencePackageSchema, {
    systemInstruction: SYSTEM_INSTRUCTION,
    prompt,
    // The one-call architecture guarantees exactly one automatic Gemini
    // request per initial analysis — an invalid response here must fail
    // immediately and surface a retry to the FOUNDER, not silently spend a
    // second request against the shared daily quota on their behalf.
    allowRetry: false,
    callSite: "generateIntelligencePackage",
  });

  return reconstructPackage(flat);
}

// ============================================================
// Explore More — same flat-wire-format fix, smaller scale (no founder
// DNA to regenerate, 1-4 opportunities instead of always 3).
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
      roadmapPhases: z
        .array(FlatRoadmapPhaseSchema)
        .min(count * 3)
        .max(count * 4),
      roadmapTasks: z
        .array(FlatRoadmapTaskSchema)
        .min(count * 6)
        .max(count * 12),
    })
    .refine((pkg) => validateRoadmapCoverage(indexes, pkg.roadmapPhases, pkg.roadmapTasks), {
      message:
        "Every opportunityIndex must have exactly 3-4 roadmapPhases entries, and every (opportunityIndex, phaseIndex) pair must have exactly 2-3 roadmapTasks entries.",
    });
}

const EXPLORE_SYSTEM_INSTRUCTION = `You are Sol, Solventia's business strategist. The founder wants to see different opportunities than the ones already shown. ${PLAIN_LANGUAGE_RULE} ${ROADMAP_RULE} ${FLAT_FORMAT_RULE} Each new opportunity needs its own complete detail AND complete roadmap already built, exactly like the original set — never a lighter-weight placeholder.`;

interface ExploreMoreOptions {
  excludeTitles: string[];
  dismissedNotes: string[];
  count: number;
}

/** The one explicit, user-triggered Gemini call behind "Explore More
 * Opportunities" — founder DNA isn't regenerated since the profile hasn't
 * changed, but each new opportunity still gets its full detail + roadmap
 * up front so switching to one is zero more calls. */
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
  // Same reasoning as generateIntelligencePackage: this per-opportunity
  // schema is large enough (roughly the same ~20-field opportunity shape,
  // ×1-4) to risk the same undocumented responseSchema complexity ceiling,
  // so the contract travels in the prompt instead of as a provider-side
  // responseSchema.
  const jsonContract = JSON.stringify(toGeminiSchema(flatSchema));
  const prompt = `Founder profile:\n${formatProfileForPrompt(profile)}${exclusion}${feedback}

Generate ${options.count} new, distinct business opportunity candidates (opportunityIndex 0${options.count > 1 ? `-${options.count - 1}` : ""}) for THIS founder, each with complete detail and a complete roadmap already built as flat roadmapPhases/roadmapTasks arrays.

Respond with ONLY a single JSON object — no markdown fences, no commentary before or after — that validates against this exact JSON Schema:
${jsonContract}`;

  const flat = await generateJSON(flatSchema, {
    systemInstruction: EXPLORE_SYSTEM_INSTRUCTION,
    prompt,
    callSite: "generateOpportunityPackageBatch",
  });

  const opportunities: OpportunityPackage[] = (flat.opportunities as FlatExploreOpportunity[])
    .slice()
    .sort((a, b) => a.opportunityIndex - b.opportunityIndex)
    .map((opp) =>
      reconstructOpportunity(
        opp,
        flat.roadmapPhases as FlatRoadmapPhase[],
        flat.roadmapTasks as FlatRoadmapTask[],
      ),
    );

  if (opportunities.length === 0) {
    throw new AIGenerationError("Explore More returned zero opportunities after reconstruction.");
  }

  return { opportunities };
}
