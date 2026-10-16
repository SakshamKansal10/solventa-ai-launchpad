import { z } from "zod";

import { generateJSON } from "@/lib/ai/gemini.server";
import {
  buildLanguageRule,
  PLAIN_LANGUAGE_RULE,
  type GenerationLocale,
} from "@/lib/ai/prompts/shared";

export const EvidenceInterpretationSchema = z.object({
  signal: z
    .enum(["supports", "contradicts", "neutral"])
    .describe("Whether this one piece of evidence supports, contradicts or is inconclusive."),
  reason: z
    .string()
    .describe(
      "One or two plain sentences explaining why, pointing at what the person actually said.",
    ),
});
export type EvidenceInterpretation = z.infer<typeof EvidenceInterpretationSchema>;

const SYSTEM = `You are Sol, Solventia's evidence interpreter. A founder has recorded ONE piece of real-world evidence against ONE assumption about their business, and wants a second opinion on which way it points. ${PLAIN_LANGUAGE_RULE}

Rules: decide only about THIS piece of evidence and THIS assumption. Say "supports" only when what happened clearly makes the assumption more likely to be true; say "contradicts" only when it clearly points against it; otherwise say "neutral" (inconclusive) — polite interest, a compliment, a vague "maybe", or an anecdote about a different problem is neutral. Be conservative, never flatter, and never invent facts that are not in the evidence. The founder makes the final call; you only suggest.`;

const CONTRACT = `{
  "signal": "supports" | "contradicts" | "neutral",
  "reason": string (1-2 plain sentences that refer to what was actually said or done)
}`;

export async function interpretEvidence(
  input: {
    assumption: string;
    whyItMatters?: string | null;
    evidenceType: string;
    sourcePerson?: string | null;
    summary: string;
  },
  locale: GenerationLocale = "en",
): Promise<EvidenceInterpretation> {
  const prompt = `Assumption being tested: ${input.assumption}${
    input.whyItMatters ? `\nWhy it matters: ${input.whyItMatters}` : ""
  }\n\nEvidence type: ${input.evidenceType}${
    input.sourcePerson ? `\nSource: ${input.sourcePerson}` : ""
  }\nWhat happened: ${input.summary}\n\nWhich way does this evidence point for that assumption?\n\nRespond with ONLY a single JSON object — no markdown fences, no commentary — matching this exact shape:\n${CONTRACT}${buildLanguageRule(locale)}`;
  return generateJSON(EvidenceInterpretationSchema, {
    systemInstruction: SYSTEM,
    prompt,
    callSite: "interpretEvidence",
    purpose: "EVIDENCE_INTERPRETATION",
    route: "proof/interpret",
  });
}
