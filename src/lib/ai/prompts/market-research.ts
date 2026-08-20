import { z } from "zod";
import { generateGrounded, generateStructured } from "@/lib/ai/gemini.server";
import { EvidenceLabelEnum, type MarketEvidenceItem } from "@/lib/ai/schemas";
import { PLAIN_LANGUAGE_RULE } from "@/lib/ai/prompts/shared";

const SYSTEM_INSTRUCTION = `You extract honest market-evidence claims from search results text. You never invent claims beyond what the text actually supports. ${PLAIN_LANGUAGE_RULE}`;

// Gemini cannot combine grounded search with a schema-constrained response,
// so the model is asked to reference sources by INDEX into the real,
// already-fetched source list — the actual title/url is substituted by code
// afterwards, never trusted from the model's own text.
const ExtractedClaimSchema = z.object({
  claim: z.string(),
  label: EvidenceLabelEnum,
  sourceIndex: z
    .number()
    .int()
    .min(0)
    .nullable()
    .describe(
      "Index into the numbered source list, or null if this is a general observation with no single source.",
    ),
});
const ExtractionResultSchema = z.object({ claims: z.array(ExtractedClaimSchema).max(6) });

export async function researchMarketEvidence(
  opportunityTitle: string,
  oneLiner: string,
  category: string,
): Promise<MarketEvidenceItem[]> {
  const searchPrompt = `Search for current, real information about this business idea: "${opportunityTitle}" — ${oneLiner} (category: ${category}). Look for: whether people already do something similar, whether there's visible demand or discussion of this need, and any relevant trends. Summarize what you actually find, plainly.`;

  const grounded = await generateGrounded(searchPrompt);

  if (grounded.sources.length === 0) {
    return [
      {
        claim:
          "No independent search evidence was found for this idea. Treat market fit as unproven until you test it directly with real people.",
        label: "limited_evidence",
        sourceTitle: null,
        sourceUrl: null,
      },
    ];
  }

  const numberedSources = grounded.sources.map((s, i) => `[${i}] ${s.title} — ${s.uri}`).join("\n");

  const extraction = await generateStructured(ExtractionResultSchema, {
    systemInstruction: SYSTEM_INSTRUCTION,
    prompt: `Search findings:\n${grounded.text}\n\nNumbered sources actually used:\n${numberedSources}\n\nExtract up to 6 distinct, honest evidence claims from these findings. Label each: "strong_signal" (clear, current, well-supported demand), "early_signal" (some real but limited support), "emerging" (new/growing trend), "competitive" (evidence others already do this), "needs_validation" (plausible but unconfirmed), or "limited_evidence" (little to go on). Reference the source by its index number, or null if it's a general synthesis across multiple sources.`,
  });

  return extraction.claims.map((c) => {
    const source = c.sourceIndex !== null ? grounded.sources[c.sourceIndex] : undefined;
    return {
      claim: c.claim,
      label: c.label,
      sourceTitle: source?.title ?? null,
      sourceUrl: source?.uri ?? null,
    };
  });
}
