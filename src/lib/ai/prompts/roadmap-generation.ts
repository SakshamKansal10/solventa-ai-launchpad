import { generateStructured } from "@/lib/ai/gemini.server";
import { RoadmapPlanSchema, type RoadmapPlan, type OpportunityDetail } from "@/lib/ai/schemas";
import { formatProfileForPrompt, PLAIN_LANGUAGE_RULE } from "@/lib/ai/prompts/shared";
import type { NormalizedProfile } from "@/lib/profile/normalize";

const SYSTEM_INSTRUCTION = `You are Sol, Solventia's execution planner. You design a realistic, staged roadmap for ONE founder to actually build ONE specific business. ${PLAIN_LANGUAGE_RULE} If the founder lacks a skill a task requires, insert a short learning task BEFORE the task that needs it — never assume competence that isn't in their profile. Task load must match their real weekly hours; do not give a 5-hour/week student the same load as a 40-hour/week founder.`;

export async function generateRoadmapPlan(
  profile: NormalizedProfile,
  opportunityTitle: string,
  detail: OpportunityDetail,
): Promise<RoadmapPlan> {
  const prompt = `Founder profile:\n${formatProfileForPrompt(profile)}

Opportunity: ${opportunityTitle}
What you already have: ${detail.whatYouAlreadyHave.join(", ")}
What you still need: ${detail.whatYouStillNeed.join(", ")}
Starting requirements: capital ${detail.startingRequirements.capital}, time ${detail.startingRequirements.time}, skills ${detail.startingRequirements.skills.join(", ")}, equipment ${detail.startingRequirements.equipment.join(", ")}

Design a staged roadmap using only the phases that genuinely apply (choose from: understand, explore, validate, build, launch, improve — skip any that don't fit this specific opportunity). Every task needs what/why/how/resource/timeEstimate/deadlineDaysFromStart/doneWhen. deadlineDaysFromStart must reflect this founder's real weekly hours (${profile.time.weeklyHours} hrs/week) — do not compress a 40-hour task load into one week for someone with 5 hours/week. Teach missing skills before tasks that require them.`;

  return generateStructured(RoadmapPlanSchema, {
    systemInstruction: SYSTEM_INSTRUCTION,
    prompt,
    callSite: "generateRoadmapPlan",
    purpose: "LEGACY_FALLBACK",
    route: "opportunity/switch-legacy",
  });
}
