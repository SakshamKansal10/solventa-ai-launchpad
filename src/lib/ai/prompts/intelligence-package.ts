import { z } from "zod";

import { generateStructured, generateJSON, AIGenerationError } from "@/lib/ai/gemini.server";
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

// ============================================================
// SCHEMA VALIDATION vs. PRODUCT-QUALITY VALIDATION — kept deliberately
// separate. Zod (below) only ever rejects genuinely broken output:
// missing/empty roadmaps, orphaned cross-references, or a runaway
// generation past all reasonable bounds. It never rejects for landing
// outside the PREFERRED count range — that's a quality signal, checked
// separately by checkRoadmapQuality() AFTER a package already passed
// validation, and it only ever warns, never throws. A roadmap with 5
// phases instead of 4, or one phase with 4 tasks instead of 3, is a good
// response and must be kept, not discarded.
// ============================================================

/** Hard ceiling only — not a quality target. Content between the
 * acceptable range and this ceiling is trimmed deterministically by
 * normalizeOpportunityRoadmap() below, never rejected; only emptiness or
 * something past this ceiling (a genuinely broken/runaway generation)
 * fails validation. */
const MAX_PHASES_PER_OPPORTUNITY_HARD = 8;
const MAX_TASKS_PER_PHASE_HARD = 6;

/** What the app actually keeps after normalization — generous enough to
 * never need a second Gemini call to "fix" a count, since excess within
 * this range (and up to the hard ceiling above) is simply trimmed. */
const ACCEPTABLE_MAX_PHASES_PER_OPPORTUNITY = 5;
const ACCEPTABLE_MAX_TASKS_PER_PHASE = 4;

/** The range this app was actually designed around — used only for
 * checkRoadmapQuality()'s non-fatal warnings, never for rejection. */
const PREFERRED_PHASES_PER_OPPORTUNITY: readonly [number, number] = [3, 4];
const PREFERRED_TASKS_PER_PHASE: readonly [number, number] = [2, 3];

/** Structural correctness only: every phase belongs to a real opportunity,
 * every task belongs to a real phase, no opportunity or phase is empty,
 * and nothing is absurdly oversized. Returns a list of specific problem
 * descriptions (empty = structurally valid) rather than a bare boolean,
 * so a rejected response tells the model exactly what to fix. */
function findRoadmapStructureIssues(
  opportunityIndexes: number[],
  phases: FlatRoadmapPhase[],
  tasks: FlatRoadmapTask[],
): string[] {
  const issues: string[] = [];

  for (const phase of phases) {
    if (!opportunityIndexes.includes(phase.opportunityIndex)) {
      issues.push(
        `roadmapPhases has an entry with opportunityIndex=${phase.opportunityIndex}, which doesn't match any real opportunity.`,
      );
    }
  }
  for (const task of tasks) {
    const hasPhase = phases.some(
      (p) => p.opportunityIndex === task.opportunityIndex && p.phaseIndex === task.phaseIndex,
    );
    if (!hasPhase) {
      issues.push(
        `roadmapTasks has an entry for opportunityIndex=${task.opportunityIndex} phaseIndex=${task.phaseIndex}, but no matching roadmapPhases entry exists.`,
      );
    }
  }

  for (const oi of opportunityIndexes) {
    const ownPhases = phases.filter((p) => p.opportunityIndex === oi);
    if (ownPhases.length === 0) {
      issues.push(`Opportunity ${oi} has no roadmap phases — every opportunity needs a roadmap.`);
      continue;
    }
    if (ownPhases.length > MAX_PHASES_PER_OPPORTUNITY_HARD) {
      issues.push(
        `Opportunity ${oi} has ${ownPhases.length} roadmap phases, which is unreasonably many (max ${MAX_PHASES_PER_OPPORTUNITY_HARD}).`,
      );
    }
    for (const phase of ownPhases) {
      const ownTasks = tasks.filter(
        (t) => t.opportunityIndex === oi && t.phaseIndex === phase.phaseIndex,
      );
      if (ownTasks.length === 0) {
        issues.push(
          `Opportunity ${oi} phase ${phase.phaseIndex} ("${phase.title}") has no tasks — every phase needs at least one.`,
        );
      } else if (ownTasks.length > MAX_TASKS_PER_PHASE_HARD) {
        issues.push(
          `Opportunity ${oi} phase ${phase.phaseIndex} ("${phase.title}") has ${ownTasks.length} tasks, which is unreasonably many (max ${MAX_TASKS_PER_PHASE_HARD}).`,
        );
      }
    }
  }

  return issues;
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
    // Generous sanity bounds only — real per-opportunity/per-phase
    // correctness is enforced by the structural superRefine below, not by
    // these flat totals (3 opportunities x up to 8 phases each, x up to 6
    // tasks each, is the absolute ceiling; normal output lands far inside it).
    roadmapPhases: z
      .array(FlatRoadmapPhaseSchema)
      .min(3)
      .max(24)
      .describe("Every phase tagged with opportunityIndex; aim for 3-4 phases per opportunity."),
    roadmapTasks: z
      .array(FlatRoadmapTaskSchema)
      .min(3)
      .max(144)
      .describe(
        "Every task tagged with opportunityIndex + phaseIndex; aim for 2-3 tasks per phase.",
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
      return;
    }
    for (const issue of findRoadmapStructureIssues(
      [0, 1, 2],
      pkg.roadmapPhases,
      pkg.roadmapTasks,
    )) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue });
    }
  });
type FlatIntelligencePackage = z.infer<typeof FlatIntelligencePackageSchema>;

/** Runs on already-schema-valid data. Trims harmless excess deterministically
 * (never a reason to reject the package, never a reason to call Gemini
 * again) so the app never has to persist an oversized roadmap just because
 * the model produced 5 phases or 4 tasks somewhere. */
function normalizeOpportunityRoadmap(
  opportunityIndex: number,
  phases: FlatRoadmapPhase[],
  tasks: FlatRoadmapTask[],
): OpportunityPackage["roadmap"]["phases"] {
  return phases
    .filter((p) => p.opportunityIndex === opportunityIndex)
    .sort((a, b) => a.phaseIndex - b.phaseIndex)
    .slice(0, ACCEPTABLE_MAX_PHASES_PER_OPPORTUNITY)
    .map((phase) => ({
      key: phase.key,
      title: phase.title,
      description: phase.description,
      tasks: tasks
        .filter((t) => t.opportunityIndex === opportunityIndex && t.phaseIndex === phase.phaseIndex)
        .sort((a, b) => a.taskIndex - b.taskIndex)
        .slice(0, ACCEPTABLE_MAX_TASKS_PER_PHASE)
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
}

function reconstructOpportunity(
  flatOpp: FlatOpportunity,
  phases: FlatRoadmapPhase[],
  tasks: FlatRoadmapTask[],
): OpportunityPackage {
  const { opportunityIndex, ...rest } = flatOpp;
  return {
    ...rest,
    roadmap: { phases: normalizeOpportunityRoadmap(opportunityIndex, phases, tasks) },
  };
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

/** Non-fatal quality signal, checked AFTER a package has already passed
 * schema validation — never thrown, never blocks persistence. Purely for
 * logging/telemetry so a founder can still be served a roadmap that's
 * outside the preferred count range but perfectly usable. */
export interface RoadmapQualityWarning {
  opportunityIndex: number;
  opportunityTitle: string;
  phaseIndex?: number;
  phaseTitle?: string;
  message: string;
}

export function checkRoadmapQuality(pkg: {
  opportunities: OpportunityPackage[];
}): RoadmapQualityWarning[] {
  const warnings: RoadmapQualityWarning[] = [];
  pkg.opportunities.forEach((opp, opportunityIndex) => {
    const phaseCount = opp.roadmap.phases.length;
    const [minPhases, maxPhases] = PREFERRED_PHASES_PER_OPPORTUNITY;
    if (phaseCount < minPhases || phaseCount > maxPhases) {
      warnings.push({
        opportunityIndex,
        opportunityTitle: opp.title,
        message: `${phaseCount} roadmap phases (preferred ${minPhases}-${maxPhases}).`,
      });
    }
    opp.roadmap.phases.forEach((phase, phaseIndex) => {
      const taskCount = phase.tasks.length;
      const [minTasks, maxTasks] = PREFERRED_TASKS_PER_PHASE;
      if (taskCount < minTasks || taskCount > maxTasks) {
        warnings.push({
          opportunityIndex,
          opportunityTitle: opp.title,
          phaseIndex,
          phaseTitle: phase.title,
          message: `${taskCount} tasks in phase "${phase.title}" (preferred ${minTasks}-${maxTasks}).`,
        });
      }
    });
  });
  return warnings;
}

const ROADMAP_RULE = `Every opportunity's roadmap must be genuinely useful to someone who may know NOTHING about entrepreneurship — never generic advice like "research the market" or "build an MVP" or "launch your business". Use only the phases that genuinely apply (from: understand, explore, validate, build, launch, improve) — a tutoring service and a manufacturing business should not get identical roadmaps. If the founder lacks a skill a task needs, insert a short learning task BEFORE it — never assume competence not in their profile. Every task needs what/why/how/resource/timeEstimate/deadlineDaysFromStart/doneWhen/required/dependsOn. deadlineDaysFromStart must reflect this founder's real weekly hours — never compress a 40-hour task load into one week for someone with 5 hours/week. Never use unexplained startup vocabulary (MVP, GTM, B2B, CAC, LTV, TAM, ICP, funnel, churn, PMF) — if a term is genuinely needed, explain it in plain words the same sentence.`;

const FLAT_FORMAT_RULE = `Return roadmapPhases and roadmapTasks as FLAT arrays (not nested), using the opportunityIndex/phaseIndex/taskIndex fields described in the schema to tie each phase and task back to its opportunity.`;

/** Exported only for diagnostic scripts to reuse the exact real string
 * without transcription risk — see scripts/_step4-diagnostic.ts. */
export const SYSTEM_INSTRUCTION = `You are Sol, Solventia's business strategist. You turn ONE founder's real, complete profile into their complete initial workspace in a single response: an honest synthesis of who they are, and exactly three genuinely different, personalized business opportunities — each with its full detail AND its full execution roadmap already built. ${PLAIN_LANGUAGE_RULE} ${ROADMAP_RULE} ${FLAT_FORMAT_RULE} Two founders with different profiles must never receive the same opportunities for the same reasons. Provide fitSignals as your honest, realistic estimate of what each opportunity actually requires — these drive a deterministic fit score computed by the application, so be realistic, never optimistic, and never invent a numeric score yourself.`;

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
// The JSON contract Gemini must follow, hand-authored and compact —
// NOT the full toGeminiSchema()/OpenAPI-style dump (that was ~8,150
// characters of machine-generated schema prose per call; this fragment
// plus its wrappers below total well under 2,000). Zod is still the
// strict validator on the way back (see FlatIntelligencePackageSchema/
// reconstructPackage) — this text only has to be clear enough for the
// model to follow, not exhaustive. Keep it in sync with
// FlatOpportunitySchema/FlatRoadmapPhaseSchema/FlatRoadmapTaskSchema/
// FounderDNASchema/FitFactorsSchema by hand; Zod will reject anything
// that drifts, so an out-of-sync contract fails loudly (as a validation
// error) rather than silently. Shared between generateIntelligencePackage
// (fixed 3 opportunities) and generateOpportunityPackageBatch/Explore
// More (1-4 opportunities) since the per-opportunity shape is identical.
const OPPORTUNITY_CONTRACT = `{
    "opportunityIndex": integer (unique within this response), "title": string, "category": string, "plainEnglishSummary": string, "customer": string, "problem": string, "solution": string,
    "whyThisFounder": string[exactly 3], "businessModelPlainEnglish": string, "startingCapital": string, "weeklyTime": string,
    "difficulty": "Beginner-friendly"|"Moderate"|"Challenging", "skillsAlreadyOwned": string[0-5], "skillsToLearn": string[0-5], "resourceRequirements": string[0-4],
    "advantages": string[2-4], "tradeoffs": string[1-4], "risks": string[1-4], "unknowns": string[0-3], "validationNeeded": string[0-3], "revenuePath": string, "firstExperiment": string,
    "fitSignals": { "requiredSkills": [{"name": string, "minLevel": "never_tried"|"beginner"|"intermediate"|"advanced"|"professional"}], "startupCapitalINR": number, "weeklyHoursNeeded": number,
      "riskLevel": "cautious"|"balanced"|"experimental", "motivationAlignment": "high"|"medium"|"low", "requiresLeadership": boolean, "requiresSales": boolean, "soloFriendly": boolean,
      "relevantExperienceYears": number, "requiresDigitalAssets": boolean, "locationFlexible": boolean }
  }`;

const ROADMAP_CONTRACT = `"roadmapPhases": [ 3-4 objects per opportunity, each: { "opportunityIndex": integer, "phaseIndex": integer starting at 0 within that opportunity, "key": "understand"|"explore"|"validate"|"build"|"launch"|"improve", "title": string, "description": string } ],
  "roadmapTasks": [ 2-3 objects per phase, each: { "opportunityIndex": integer, "phaseIndex": matching a roadmapPhases entry, "taskIndex": integer starting at 0 within that phase, "what": string, "why": string, "how": string, "resource": string|null, "timeEstimate": string, "deadlineDaysFromStart": number, "doneWhen": string, "required": boolean, "dependsOn": the exact "what" text of a prior task in this same phase written in plain English (e.g. "Create your first menu package"), or null if it can start independently — NEVER an index, number, or ID like "0-0-1" } ]`;

const INTELLIGENCE_PACKAGE_JSON_CONTRACT = `{
  "founderDNA": { "narrativeSummary": string, "strengths": string[2-5], "resources": string[1-5], "constraints": string[1-5], "workStyle": string, "riskProfile": string, "direction": string, "strategicSignals": string[1-4] },
  "opportunities": [ exactly 3 objects, opportunityIndex 0|1|2, each: ${OPPORTUNITY_CONTRACT} ],
  ${ROADMAP_CONTRACT}
}`;

export async function generateIntelligencePackage(
  profile: NormalizedProfile,
): Promise<SolventiaIntelligencePackage> {
  const prompt = `Founder profile:\n${formatProfileForPrompt(profile)}

Produce this founder's complete initial Solventia workspace in one response:

1. founderDNA — a concise, honest synthesis (not a restatement of every answer). strategicSignals must be insights that only emerge from COMBINING multiple answers together, not a single fact repeated.

2. Exactly 3 opportunities (opportunityIndex 0, 1, 2) — genuinely different strategic options (never the same idea worded three ways), each grounded in this founder's real skills, resources, time, risk tolerance, motivation, and constraints. Never suggest anything that conflicts with a stated constraint. Each "whyThisFounder" reason must cite a specific real signal from their profile, not a generic trait.

3. A complete roadmap per opportunity, as flat roadmapPhases/roadmapTasks arrays tagged with opportunityIndex/phaseIndex/taskIndex. EXACT COUNTS MATTER — this is checked programmatically after you respond: give EACH of the 3 opportunities EXACTLY 3 or 4 roadmapPhases (never fewer than 3, never more than 4), and give EACH phase EXACTLY 2 or 3 roadmapTasks (never fewer than 2, never more than 3). Before finishing, count your own phases and tasks per opportunity and correct any that fall outside these bounds.

Respond with ONLY a single JSON object — no markdown fences, no commentary before or after — matching this exact shape:
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
    purpose: "INITIAL_INTELLIGENCE",
    route: "consultation/complete",
    thinkingLevel: env.INITIAL_AI_THINKING_LEVEL,
  });

  const pkg = reconstructPackage(flat);

  // Non-fatal — a package outside the preferred count range is still a
  // good, complete response and must still be persisted; this is
  // diagnostic signal only, never a reason to discard the package or spend
  // a second Gemini call "fixing" it.
  const qualityWarnings = checkRoadmapQuality(pkg);
  if (qualityWarnings.length > 0) {
    console.warn(
      `[intelligence-package] roadmap quality warnings (non-fatal, package still used):`,
      qualityWarnings,
    );
  }

  return pkg;
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
      // Generous sanity bounds only — see FlatIntelligencePackageSchema's
      // comment. Real correctness is the structural superRefine below.
      roadmapPhases: z
        .array(FlatRoadmapPhaseSchema)
        .min(count)
        .max(count * MAX_PHASES_PER_OPPORTUNITY_HARD),
      roadmapTasks: z
        .array(FlatRoadmapTaskSchema)
        .min(count)
        .max(count * MAX_PHASES_PER_OPPORTUNITY_HARD * MAX_TASKS_PER_PHASE_HARD),
    })
    .superRefine((pkg, ctx) => {
      for (const issue of findRoadmapStructureIssues(
        indexes,
        pkg.roadmapPhases,
        pkg.roadmapTasks,
      )) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue });
      }
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
  // Same reasoning as generateIntelligencePackage: the contract travels in
  // the prompt as compact hand-authored text, not a provider-side
  // responseSchema or a machine-generated OpenAPI dump.
  const jsonContract = `{
  "opportunities": [ exactly ${options.count} objects, opportunityIndex 0${options.count > 1 ? `-${options.count - 1}` : ""}, each: ${OPPORTUNITY_CONTRACT} ],
  ${ROADMAP_CONTRACT}
}`;
  const prompt = `Founder profile:\n${formatProfileForPrompt(profile)}${exclusion}${feedback}

Generate ${options.count} new, distinct business opportunity candidates (opportunityIndex 0${options.count > 1 ? `-${options.count - 1}` : ""}) for THIS founder, each with complete detail and a complete roadmap already built as flat roadmapPhases/roadmapTasks arrays.

EXACT COUNTS MATTER — this is checked programmatically after you respond: give EACH opportunity EXACTLY 3 or 4 roadmapPhases (never fewer than 3, never more than 4), and give EACH phase EXACTLY 2 or 3 roadmapTasks (never fewer than 2, never more than 3). Before finishing, count your own phases and tasks per opportunity and correct any that fall outside these bounds.

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

  const qualityWarnings = checkRoadmapQuality({ opportunities });
  if (qualityWarnings.length > 0) {
    console.warn(
      `[intelligence-package] Explore More roadmap quality warnings (non-fatal):`,
      qualityWarnings,
    );
  }

  return { opportunities };
}
