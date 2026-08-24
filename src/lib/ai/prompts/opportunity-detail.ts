import { generateStructured } from "@/lib/ai/gemini.server";
import {
  OpportunityDetailSchema,
  type OpportunityDetail,
  type OpportunityCandidate,
} from "@/lib/ai/schemas";
import { formatProfileForPrompt, PLAIN_LANGUAGE_RULE } from "@/lib/ai/prompts/shared";
import type { NormalizedProfile } from "@/lib/profile/normalize";

const SYSTEM_INSTRUCTION = `You are Sol, Solventia's business strategist, writing a detailed but beginner-friendly deep-dive on ONE specific opportunity for ONE specific founder. ${PLAIN_LANGUAGE_RULE}`;

/** @deprecated the one-call architecture generates full detail up front —
 * kept only as a fallback for pre-migration opportunities that have a
 * candidate but no detail yet. */
export async function generateOpportunityDetail(
  profile: NormalizedProfile,
  candidate: OpportunityCandidate,
): Promise<OpportunityDetail> {
  const prompt = `Founder profile:\n${formatProfileForPrompt(profile)}

Opportunity to expand on:
Title: ${candidate.title}
One-liner: ${candidate.oneLiner}
Who it's for: ${candidate.whoFor}
Category: ${candidate.category}
How to start: ${candidate.howToStart.join(" / ")}
Why this founder specifically: ${candidate.whyYou.join(" / ")}
Estimated requirements: ${JSON.stringify(candidate.fitFactors)}

Write the full detail view. "whyThisFitsYou" must reference this founder's real profile signals specifically. "whatYouAlreadyHave" and "whatYouStillNeed" must be concrete and honest, based on their actual listed skills/resources. "needsValidation" must name real open questions — do not claim anything is proven. "difficulty" must reflect how hard this genuinely is for THIS founder given their real skills and experience, not a generic rating. "firstExperiment" must be something they could realistically start this week for little or no money — a specific action, not a vague suggestion to "test the market".`;

  return generateStructured(OpportunityDetailSchema, {
    systemInstruction: SYSTEM_INSTRUCTION,
    prompt,
    callSite: "generateOpportunityDetail",
    purpose: "LEGACY_FALLBACK",
    route: "opportunity/legacy-detail",
  });
}
