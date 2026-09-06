import { generateStructured } from "@/lib/ai/gemini.server";
import { RoadmapPlanSchema, type RoadmapPlan, type OpportunityPackage } from "@/lib/ai/schemas";
import { formatProfileForPrompt, PLAIN_LANGUAGE_RULE } from "@/lib/ai/prompts/shared";
import type { NormalizedProfile } from "@/lib/profile/normalize";

/** The on-demand, single-opportunity Gemini call behind "Build My
 * Roadmap" — fires only after a founder explicitly selects one of their 3
 * generated ideas, never during initial generation or Explore More. Uses a
 * real provider-side responseSchema (generateStructured), not the flat/
 * hand-authored-contract workaround idea-generation needs: this response
 * only ever describes ONE opportunity, well under the complexity ceiling
 * that forced that workaround for the old 3-roadmaps-at-once response. */
const SYSTEM_INSTRUCTION = `You are Sol, Solventia's execution planner. You design a realistic, staged roadmap for ONE founder to actually build ONE specific business, broken into phases and, within each phase, into weeks that unlock one at a time as the founder finishes the one before it. ${PLAIN_LANGUAGE_RULE} Use only the phases that genuinely apply (choose from: understand, explore, validate, build, launch, improve — skip any that don't fit this specific opportunity). Each week needs a clear, single-sentence objective a founder can read BEFORE the week unlocks — it must make sense on its own, without seeing the tasks inside it yet. If the founder lacks a skill a task requires, insert a short learning task BEFORE the task that needs it — never assume competence that isn't in their profile. Task and week load must match their real weekly hours; do not give a 5-hour/week founder the same load as a 40-hour/week founder — a week's tasks should realistically fit in roughly one calendar week for THIS founder. Never use unexplained startup vocabulary (MVP, GTM, B2B, CAC, LTV, TAM, ICP, funnel, churn, PMF) — if a term is genuinely needed, explain it in plain words the same sentence.`;

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

Design a staged roadmap: 3-4 phases, each with 1-3 weeks, each week with 2-4 tasks. Every task needs what/why/how/resource/timeEstimate/deadlineDaysFromStart/doneWhen/required/dependsOn. deadlineDaysFromStart must reflect this founder's real weekly hours (${profile.time.weeklyHours} hrs/week) and must group cleanly into the week that contains it — do not compress a 40-hour task load into one week for someone with 5 hours/week. Teach missing skills before tasks that require them. dependsOn must be the exact "what" text of a prior task, or null — never an index or ID.`;

  return generateStructured(RoadmapPlanSchema, {
    systemInstruction: SYSTEM_INSTRUCTION,
    prompt,
    callSite: "generateRoadmapPlan",
    purpose: "ROADMAP_GENERATION",
    route: "opportunity/build-roadmap",
  });
}
