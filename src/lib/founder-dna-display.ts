import type { FounderDNA, FounderAnalysis } from "@/lib/ai/schemas";

/** One shape the UI renders from, regardless of whether the stored
 * business_dna.founder_analysis is the new rich FounderDNA or a
 * pre-migration FounderAnalysis. */
export interface FounderDisplayDNA {
  narrativeSummary: string;
  strengths: string[];
  constraints: string[];
  workStyle: string | null;
  riskProfile: string | null;
  direction: string | null;
  strategicSignals: string[];
}

function isFounderDNAShape(analysis: FounderDNA | FounderAnalysis): analysis is FounderDNA {
  return "narrativeSummary" in analysis;
}

export function toDisplayFounderDNA(
  analysis: FounderDNA | FounderAnalysis | null,
): FounderDisplayDNA | null {
  if (!analysis) return null;

  if (isFounderDNAShape(analysis)) {
    return {
      narrativeSummary: analysis.narrativeSummary,
      strengths: analysis.strengths,
      constraints: analysis.constraints,
      workStyle: analysis.workStyle,
      riskProfile: analysis.riskProfile,
      direction: analysis.direction,
      strategicSignals: analysis.strategicSignals,
    };
  }

  // Legacy pre-migration shape.
  return {
    narrativeSummary: analysis.summary,
    strengths: analysis.strengths,
    constraints: analysis.constraints,
    workStyle: null,
    riskProfile: null,
    direction: null,
    strategicSignals: analysis.reflection ? [analysis.reflection] : [],
  };
}
