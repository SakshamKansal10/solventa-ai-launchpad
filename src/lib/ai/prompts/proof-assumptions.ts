import { z } from "zod";

import { generateJSON } from "@/lib/ai/gemini.server";
import type { OpportunityPackage, OpportunityCandidate } from "@/lib/ai/schemas";
import {
  buildLanguageRule,
  formatProfileForPrompt,
  PLAIN_LANGUAGE_RULE,
  type GenerationLocale,
} from "@/lib/ai/prompts/shared";
import type { NormalizedProfile } from "@/lib/profile/normalize";

export const ASSUMPTION_CATEGORIES = [
  "problem",
  "willingness_to_pay",
  "distribution",
  "delivery",
  "retention",
  "pricing",
  "competition",
  "other",
] as const;

export const ProofAssumptionSchema = z.object({
  title: z
    .string()
    .describe(
      "ONE falsifiable sentence naming who, and what must be true — e.g. 'Independent clinics feel follow-up revenue leakage strongly enough to pay to fix it.'",
    ),
  category: z.enum(ASSUMPTION_CATEGORIES),
  whyItMatters: z.string().describe("One sentence: what breaks if this is false."),
  nextTest: z
    .string()
    .describe(
      "One concrete, cheap test the founder can run this week to find out — never 'do research'.",
    ),
  successThreshold: z
    .number()
    .int()
    .min(2)
    .max(10)
    .describe("How many INDEPENDENT supporting pieces of evidence would make this credible."),
});

export const ProofAssumptionsSchema = z.object({
  assumptions: z.array(ProofAssumptionSchema).min(3).max(4),
});
export type ProofAssumptionPlan = z.infer<typeof ProofAssumptionSchema>;

const SYSTEM = `You are Sol, Solventia's validation planner. Given ONE business direction, you name the 3-4 CRITICAL assumptions that must be true for it to work — the ones that, if false, make the whole business fail. ${PLAIN_LANGUAGE_RULE}

Rules: each assumption is a single falsifiable sentence about a specific customer and a specific behaviour, not a vague goal. Cover, in this priority order, the assumptions that genuinely apply: problem (the customer feels this pain strongly and often), willingness_to_pay (they already pay, or would, for a fix), distribution (the founder can reach the first customers), delivery (the founder can deliver at the needed quality/cost). Add retention, pricing or competition only if it is truly critical to THIS business. Never state a market size, statistic or fact as if it were known — these are hypotheses to TEST. The nextTest must be something a founder can do in a week with the resources in their profile. Do not repeat the same assumption in different words.`;

const CONTRACT = `{
  "assumptions": [ 3-4 objects, each: {
    "title": string (one falsifiable sentence),
    "category": "problem"|"willingness_to_pay"|"distribution"|"delivery"|"retention"|"pricing"|"competition"|"other",
    "whyItMatters": string (one sentence),
    "nextTest": string (one concrete test doable this week),
    "successThreshold": integer 2-10 (independent supporting items that would make it credible)
  } ]
}`;

type Pkg = OpportunityPackage | OpportunityCandidate;

function describeOpportunity(p: Pkg): string {
  if ("plainEnglishSummary" in p) {
    return `Opportunity: ${p.title}\nWhat it is: ${p.plainEnglishSummary}\nWho pays: ${p.customer}\nThe problem: ${p.problem}\nThe solution: ${p.solution}\nRevenue path: ${p.revenuePath}\nAlready flagged as needing validation: ${p.validationNeeded.join("; ") || "nothing listed"}\nOpen unknowns: ${p.unknowns.join("; ") || "nothing listed"}`;
  }
  return `Opportunity: ${p.title}\nWhat it is: ${p.oneLiner}\nWho pays: ${p.whoFor}`;
}

export async function generateProofAssumptions(
  profile: NormalizedProfile,
  opportunity: Pkg,
  locale: GenerationLocale = "en",
): Promise<ProofAssumptionPlan[]> {
  const prompt = `Founder profile:\n${formatProfileForPrompt(profile)}\n\n${describeOpportunity(opportunity)}\n\nName this direction's 3-4 critical assumptions.\n\nRespond with ONLY a single JSON object — no markdown fences, no commentary — matching this exact shape:\n${CONTRACT}${buildLanguageRule(locale)}`;
  const result = await generateJSON(ProofAssumptionsSchema, {
    systemInstruction: SYSTEM,
    prompt,
    callSite: "generateProofAssumptions",
    purpose: "PROOF_ASSUMPTIONS",
    route: "proof/assumptions",
  });
  return result.assumptions;
}

/** Deterministic fallback used when the AI call fails, so Proof is never a
 * dead end. It only rephrases what the stored package already says — it adds
 * no facts. */
export function templateAssumptions(p: Pkg): ProofAssumptionPlan[] {
  const customer = "customer" in p ? p.customer : p.whoFor;
  const problem = "problem" in p ? p.problem : p.oneLiner;
  const solution = "solution" in p ? p.solution : p.oneLiner;
  const flagged = "validationNeeded" in p ? p.validationNeeded : [];

  const list: ProofAssumptionPlan[] = [
    {
      title: `${customer} feel this problem strongly and often enough to act: ${problem}`,
      category: "problem",
      whyItMatters:
        "If the pain is mild or rare, nobody will change their behaviour or pay to fix it.",
      nextTest:
        "Interview 8 people who match this customer and ask the same questions about how they handle it today — without pitching.",
      successThreshold: 5,
    },
    {
      title: `${customer} will pay for this: ${solution}`,
      category: "willingness_to_pay",
      whyItMatters:
        "Interest is not revenue — without real willingness to pay there is no business.",
      nextTest: "Ask five of them for a small paid pilot or a pre-order at a real price.",
      successThreshold: 3,
    },
    {
      title: "You can reach your first ten customers through a channel you already have access to.",
      category: "distribution",
      whyItMatters: "A good product nobody can reach never gets its first customers.",
      nextTest: "List ten named people you can contact this week and contact five of them.",
      successThreshold: 3,
    },
    {
      title:
        "You can deliver this at the quality customers expect with your current time and skills.",
      category: "delivery",
      whyItMatters:
        "If delivery costs more time or money than you have, growth stalls immediately.",
      nextTest:
        "Deliver the smallest possible version once, for free or cheap, and time how long it really takes.",
      successThreshold: 2,
    },
  ];

  // The package's own "needs validation" items become the test for the
  // assumption they most naturally belong to — never extra invented claims.
  flagged.slice(0, 3).forEach((f, i) => {
    if (list[i]) list[i] = { ...list[i], nextTest: `${f} — test this directly this week.` };
  });
  return list;
}
