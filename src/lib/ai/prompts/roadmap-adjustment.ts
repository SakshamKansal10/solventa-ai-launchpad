import { generateJSON } from "@/lib/ai/gemini.server";
import { RoadmapPlanSchema, type RoadmapPlan } from "@/lib/ai/schemas";
import { formatProfileForPrompt, PLAIN_LANGUAGE_RULE } from "@/lib/ai/prompts/shared";
import type { NormalizedProfile } from "@/lib/profile/normalize";

const SYSTEM_INSTRUCTION = `You are Sol, Solventia's execution planner. A founder fell behind on their roadmap. You replan ONLY the remaining work — never re-litigate what's already done. ${PLAIN_LANGUAGE_RULE} Be realistic about the setback; don't just compress the same task load into less time.`;

export type ReplanBlockerReason =
  "time" | "money" | "difficulty" | "confusion" | "motivation" | "access" | "other";

interface ReplanContext {
  opportunityTitle: string;
  completedSummary: string;
  remainingTasksSummary: string;
  blockerReason: ReplanBlockerReason;
  blockerNote: string;
}

// Same complexity-ceiling reasoning as roadmap-generation.ts:
// phase -> week -> task is a 3-level-deep nested schema — generateJSON
// (hand-authored contract + local Zod validation), not
// generateStructured's provider-side schema.
const ROADMAP_JSON_CONTRACT = `{
  "phases": [ 3-4 objects, each: {
    "key": "understand"|"explore"|"validate"|"build"|"launch"|"improve", "title": string, "description": string,
    "weeks": [ 1-3 objects, each: {
      "weekNumber": integer starting at 1 within this phase, "title": string, "objective": string (one sentence, must make sense before the week's tasks are seen),
      "tasks": [ 2-4 objects, each: { "what": string, "why": string, "how": string, "resource": string|null, "timeEstimate": string, "deadlineDaysFromStart": number, "doneWhen": string, "required": boolean, "dependsOn": the exact "what" text of a prior task in this same roadmap written in plain English, or null if it can start independently — NEVER an index, number, or ID }
    ] }
  ] }
] }`;

export async function replanRoadmap(
  profile: NormalizedProfile,
  ctx: ReplanContext,
): Promise<RoadmapPlan> {
  const prompt = `Founder profile:\n${formatProfileForPrompt(profile)}

Opportunity: ${ctx.opportunityTitle}
Already completed: ${ctx.completedSummary || "nothing yet"}
Remaining tasks before replanning: ${ctx.remainingTasksSummary}
What got in the way: ${ctx.blockerReason}${ctx.blockerNote ? ` — "${ctx.blockerNote}"` : ""}

Replan ONLY the remaining path forward, adjusted for what actually happened. If the blocker was time or money, reduce scope or stretch deadlines realistically rather than pretending nothing changed. If it was difficulty or confusion, break the next task down smaller and add a learning step first. Return the full remaining roadmap as phases, each broken into weeks (1-3 per phase, 2-4 tasks per week, each week with its own short objective) — do not include already-completed work.

Respond with ONLY a single JSON object — no markdown fences, no commentary before or after — matching this exact shape:
${ROADMAP_JSON_CONTRACT}`;

  return generateJSON(RoadmapPlanSchema, {
    systemInstruction: SYSTEM_INSTRUCTION,
    prompt,
    callSite: "replanRoadmap",
    purpose: "ROADMAP_REPLAN",
    route: "roadmap/replan",
  });
}
