import { generateJSON } from "@/lib/ai/gemini.server";
import {
  RoadmapPlanSchema,
  RoadmapSkeletonSchema,
  RoadmapWeekDetailSchema,
  type RoadmapPlan,
  type RoadmapSkeletonPlan,
  type RoadmapWeekDetailPlan,
  type OpportunityPackage,
} from "@/lib/ai/schemas";
import { formatProfileForPrompt, PLAIN_LANGUAGE_RULE } from "@/lib/ai/prompts/shared";
import type { NormalizedProfile } from "@/lib/profile/normalize";

/** The on-demand, single-opportunity Gemini call behind "Build My
 * Roadmap" — fires only after a founder explicitly selects one of their 3
 * generated ideas, never during initial generation or Explore More.
 *
 * Uses generateJSON (hand-authored JSON contract in the prompt + local
 * Zod validation on the way back), NOT generateStructured's provider-side
 * responseSchema — even though this call only ever describes ONE
 * opportunity, phase -> week -> task is a 3-level-deep nested schema (up
 * to 4 phases x 3 weeks x 4 tasks x 9 fields each), comparable in overall
 * complexity to the old 3-opportunities-at-once response that empirically
 * tripped Gemini's structured-output complexity ceiling twice before (see
 * intelligence-package.ts). generateJSON is the proven-reliable path for
 * exactly this class of schema in this codebase — safer to use it here
 * from the start than to wait for a live 400 to prove the point again. */
const SYSTEM_INSTRUCTION = `You are Sol, Solventia's execution planner. You design a realistic, staged roadmap for ONE founder to actually build ONE specific business, broken into phases and, within each phase, into weeks that unlock one at a time as the founder finishes the one before it. ${PLAIN_LANGUAGE_RULE} Use only the phases that genuinely apply (choose from: understand, explore, validate, build, launch, improve — skip any that don't fit this specific opportunity). Each week needs a clear, single-sentence objective a founder can read BEFORE the week unlocks — it must make sense on its own, without seeing the tasks inside it yet. If the founder lacks a skill a task requires, insert a short learning task BEFORE the task that needs it — never assume competence that isn't in their profile. Task and week load must match their real weekly hours; do not give a 5-hour/week founder the same load as a 40-hour/week founder — a week's tasks should realistically fit in roughly one calendar week for THIS founder. Never use unexplained startup vocabulary (MVP, GTM, B2B, CAC, LTV, TAM, ICP, funnel, churn, PMF) — if a term is genuinely needed, explain it in plain words the same sentence.`;

const ROADMAP_JSON_CONTRACT = `{
  "phases": [ 3-4 objects, each: {
    "key": "understand"|"explore"|"validate"|"build"|"launch"|"improve", "title": string, "description": string,
    "weeks": [ 1-3 objects, each: {
      "weekNumber": integer starting at 1 within this phase, "title": string, "objective": string (one sentence, must make sense before the week's tasks are seen),
      "tasks": [ 2-4 objects, each: { "what": string, "why": string, "how": string, "resource": string|null, "timeEstimate": string, "deadlineDaysFromStart": number, "doneWhen": string, "required": boolean, "dependsOn": the exact "what" text of a prior task in this same roadmap written in plain English, or null if it can start independently — NEVER an index, number, or ID }
    ] }
  ] }
] }`;

export async function generateRoadmapPlan(
  profile: NormalizedProfile,
  opportunity: OpportunityPackage,
): Promise<RoadmapPlan> {
  const prompt = `Founder profile:\n${formatProfileForPrompt(profile)}

Opportunity: ${opportunity.title}
What it is: ${opportunity.plainEnglishSummary}
Who it's for: ${opportunity.customer}
The problem: ${opportunity.problem}
The solution: ${opportunity.solution}
Why this fits this founder: ${opportunity.whyThisFounder.join("; ")}
Skills already owned: ${opportunity.skillsAlreadyOwned.join(", ") || "none listed"}
Skills to learn: ${opportunity.skillsToLearn.join(", ") || "none listed"}
Starting capital: ${opportunity.startingCapital}
Weekly time: ${opportunity.weeklyTime}
Resources needed: ${opportunity.resourceRequirements.join(", ") || "none listed"}
First experiment already suggested: ${opportunity.firstExperiment}

Design a staged roadmap: 3-4 phases, each with 1-3 weeks, each week with 2-4 tasks. deadlineDaysFromStart must reflect this founder's real weekly hours (${profile.time.weeklyHours} hrs/week) and must group cleanly into the week that contains it — do not compress a 40-hour task load into one week for someone with 5 hours/week. Teach missing skills before tasks that require them.

Respond with ONLY a single JSON object — no markdown fences, no commentary before or after — matching this exact shape:
${ROADMAP_JSON_CONTRACT}`;

  return generateJSON(RoadmapPlanSchema, {
    systemInstruction: SYSTEM_INSTRUCTION,
    prompt,
    callSite: "generateRoadmapPlan",
    purpose: "ROADMAP_GENERATION",
    route: "opportunity/build-roadmap",
  });
}

// ============================================================
// JIT (just-in-time) generation — the real "Build My Roadmap" path.
// generateRoadmapSkeleton produces the long-term shape (phases + weeks,
// titles/objectives only) in one lightweight call; generateWeekDetail
// fills in exactly one week's real mission/tasks, called only when that
// week actually unlocks (see actions/roadmap-persistence.server.ts and
// actions/roadmap.ts). generateRoadmapPlan above is kept only for the
// internal /review-public diagnostics tool, which deliberately exercises
// the older single-call shape for comparison — it is NOT used by the
// real founder-facing "Build My Roadmap" flow.
// ============================================================

const SKELETON_SYSTEM_INSTRUCTION = `You are Sol, Solventia's execution planner. You design the long-term SHAPE of a founder's path to actually build ONE specific business — phases and, within each phase, weeks — WITHOUT writing any task detail yet, since only the active week's detail is ever generated, just before the founder needs it. ${PLAIN_LANGUAGE_RULE} Use only the phases that genuinely apply (choose from: understand, explore, validate, build, launch, improve — skip any that don't fit this specific opportunity, and use realistic phase LENGTH — validating a problem might be 3 weeks, building repeatable acquisition might be 10). Together the phases should span roughly 40-52 weeks of realistic founder progress — a real year of building a business, not a 6-week sprint — but never pad with meaningless weeks just to hit that number; a genuinely simpler business can run shorter. Each week needs a title and ONE-sentence objective a founder can read before it unlocks, without seeing any tasks yet.`;

const SKELETON_JSON_CONTRACT = `{
  "phases": [ 4-8 objects, each: {
    "key": "understand"|"explore"|"validate"|"build"|"launch"|"improve", "title": string, "description": string,
    "weeks": [ 1-10 objects, each: { "weekNumber": integer starting at 1 within this phase, "title": string, "objective": string (one sentence) } ]
  } ]
}`;

export async function generateRoadmapSkeleton(
  profile: NormalizedProfile,
  opportunity: OpportunityPackage,
): Promise<RoadmapSkeletonPlan> {
  const prompt = `Founder profile:\n${formatProfileForPrompt(profile)}

Opportunity: ${opportunity.title}
What it is: ${opportunity.plainEnglishSummary}
Who it's for: ${opportunity.customer}
The problem: ${opportunity.problem}
The solution: ${opportunity.solution}
Starting capital: ${opportunity.startingCapital}
Weekly time: ${opportunity.weeklyTime}
Revenue path: ${opportunity.revenuePath}

Design the long-term shape only — phase and week titles/objectives, no tasks. This founder has ${profile.time.weeklyHours} hrs/week realistically available; phase/week LENGTH (how many weeks a phase takes) should reflect that, not a generic timeline.

Respond with ONLY a single JSON object — no markdown fences, no commentary before or after — matching this exact shape:
${SKELETON_JSON_CONTRACT}`;

  return generateJSON(RoadmapSkeletonSchema, {
    systemInstruction: SKELETON_SYSTEM_INSTRUCTION,
    prompt,
    callSite: "generateRoadmapSkeleton",
    purpose: "ROADMAP_SKELETON",
    route: "opportunity/build-roadmap",
  });
}

const WEEK_DETAIL_SYSTEM_INSTRUCTION = `You are Sol, Solventia's execution planner. You are filling in the REAL detail for exactly ONE week of a founder's roadmap, right as it unlocks — not the whole roadmap. ${PLAIN_LANGUAGE_RULE} Give this week 2-5 concrete actions (tasks) that realistically fit this founder's weekly hours. If the founder lacks a skill a task requires, insert a short learning task before the task that needs it. State honestly what real-world evidence (if any) this week should produce — interviews, a test purchase, a signed customer, direct observation — and what "this week worked" concretely looks like; a pure-execution week (no evidence to collect) should say so plainly rather than inventing evidence for its own sake. Name 1-3 real, specific mistakes founders make in exactly this kind of week — never generic advice like "stay organized". If this week follows an earlier one, actually use what happened in that earlier week (what got done, and the founder's own reflection if given) to shape this week — never ignore it and repeat a generic template.`;

const WEEK_DETAIL_JSON_CONTRACT = `{
  "mission": string (concrete, more specific than the objective already shown),
  "tasks": [ 2-5 objects, each: { "what": string, "why": string, "how": string, "resource": string|null, "timeEstimate": string, "deadlineDaysFromStart": number, "doneWhen": string, "required": boolean, "dependsOn": the exact "what" text of a prior task THIS WEEK, or null if it can start independently — NEVER an index, number, or ID } ],
  "mistakesToAvoid": string[1-3],
  "evidenceRequired": string,
  "successThreshold": string
}`;

export interface WeekGenerationContext {
  phaseTitle: string;
  phaseDescription: string;
  weekTitle: string;
  weekObjective: string;
  weekNumber: number;
  /** Null for week 1 — nothing precedes it yet. */
  priorWeek: {
    title: string;
    completedTasks: string[];
    /** The founder's own short note on how it went, if they gave one —
     * the real "evidence" that makes week 2+ genuinely adaptive instead
     * of following a plan frozen at roadmap creation. */
    reflection: string | null;
  } | null;
}

export async function generateWeekDetail(
  profile: NormalizedProfile,
  opportunity: OpportunityPackage,
  context: WeekGenerationContext,
): Promise<RoadmapWeekDetailPlan> {
  const priorWeekSection = context.priorWeek
    ? `\nPrevious week ("${context.priorWeek.title}") — what actually happened: completed: ${context.priorWeek.completedTasks.join("; ") || "nothing recorded"}. Founder's own reflection: "${context.priorWeek.reflection ?? "none given"}". Let this genuinely inform this week — adjust pace, address anything the reflection raises, don't just continue a frozen plan.`
    : "\nThis is Week 1 — nothing precedes it.";

  const prompt = `Founder profile:\n${formatProfileForPrompt(profile)}

Opportunity: ${opportunity.title}
What it is: ${opportunity.plainEnglishSummary}
Who it's for: ${opportunity.customer}
The solution: ${opportunity.solution}
Skills already owned: ${opportunity.skillsAlreadyOwned.join(", ") || "none listed"}
Skills to learn: ${opportunity.skillsToLearn.join(", ") || "none listed"}

Roadmap phase: ${context.phaseTitle} — ${context.phaseDescription}
This week (already shown to the founder before it unlocked): "${context.weekTitle}" — ${context.weekObjective}
${priorWeekSection}

Generate this week's real detail now. deadlineDaysFromStart values must be 0-6 (days into THIS week, day 0 = the day it unlocked) and reflect ${profile.time.weeklyHours} hrs/week.

Respond with ONLY a single JSON object — no markdown fences, no commentary before or after — matching this exact shape:
${WEEK_DETAIL_JSON_CONTRACT}`;

  return generateJSON(RoadmapWeekDetailSchema, {
    systemInstruction: WEEK_DETAIL_SYSTEM_INSTRUCTION,
    prompt,
    callSite: "generateWeekDetail",
    purpose: "WEEK_DETAIL",
    route: "opportunity/build-roadmap",
  });
}
