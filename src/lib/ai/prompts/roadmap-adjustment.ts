import { generateStructured } from "@/lib/ai/gemini.server";
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

export async function replanRoadmap(
  profile: NormalizedProfile,
  ctx: ReplanContext,
): Promise<RoadmapPlan> {
  const prompt = `Founder profile:\n${formatProfileForPrompt(profile)}

Opportunity: ${ctx.opportunityTitle}
Already completed: ${ctx.completedSummary || "nothing yet"}
Remaining tasks before replanning: ${ctx.remainingTasksSummary}
What got in the way: ${ctx.blockerReason}${ctx.blockerNote ? ` — "${ctx.blockerNote}"` : ""}

Replan ONLY the remaining path forward, adjusted for what actually happened. If the blocker was time or money, reduce scope or stretch deadlines realistically rather than pretending nothing changed. If it was difficulty or confusion, break the next task down smaller and add a learning step first. Return the full remaining roadmap as phases/tasks (do not include already-completed work).`;

  return generateStructured(RoadmapPlanSchema, {
    systemInstruction: SYSTEM_INSTRUCTION,
    prompt,
  });
}
