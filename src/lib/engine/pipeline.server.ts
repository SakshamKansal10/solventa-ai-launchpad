import { AIGenerationError } from "@/lib/ai/gemini.server";
import {
  attackCandidates,
  ENGINE_PROMPT_VERSION,
  generateCandidates,
  seedsForExpansion,
} from "@/lib/ai/prompts/engine";
import { generateOpportunityPackageBatch } from "@/lib/ai/prompts/intelligence-package";
import type { GenerationLocale } from "@/lib/ai/prompts/shared";
import type { OpportunityPackage, SolventiaIntelligencePackage } from "@/lib/ai/schemas";
import type { NormalizedProfile } from "@/lib/profile/normalize";

import {
  chooseDirections,
  filterHardLimits,
  scoreCandidates,
  understand,
  type Dropped,
  type EngineBrief,
  type MoneyCheck,
  type Scored,
} from "./stages";

/** What the engine knew about each chosen direction — stored with it, shown and tested. */
export interface EngineNotes {
  promptVersion: string;
  type: string;
  money: MoneyCheck & { pricePerUnit: number; unit: string; unitsPerMonth: number };
  /** The profile answer behind each fit dimension (null = "Not known yet"). */
  evidence: Scored["evidence"];
  objection: string | null;
}

export interface EngineTrace {
  promptVersion: string;
  brief: EngineBrief;
  generated: number;
  dropped: Dropped[];
  fatal: { title: string; objection: string }[];
  /** Fewer than three directions: what would sharpen the result. */
  missing: string[];
  calls: number;
  ms: number;
}

/** How many of the best-scored candidates the attack stage sees. */
const SHORTLIST = 7;

/**
 * Idea engine v2 (redesign-v2 part 5, step 3): understand → generate wide → filter on hard
 * limits → fit (with the profile evidence per dimension) → money in code → attack → choose up to
 * three, different from each other → expand the chosen ones into the full direction shape the
 * dashboard already shows. Fewer than three is an honest result; none is an error that says why.
 */
export async function runEngineV2(
  profile: NormalizedProfile,
  locale: GenerationLocale = "en",
): Promise<{ pkg: SolventiaIntelligencePackage; notes: EngineNotes[]; trace: EngineTrace }> {
  const started = Date.now();
  const brief = understand(profile);
  const wide = await generateCandidates(profile, brief, locale);
  const { kept, dropped } = filterHardLimits(wide.candidates, brief);
  const scored = scoreCandidates(profile, brief, kept);
  const shortlist = scored.slice(0, SHORTLIST);
  if (shortlist.length === 0)
    throw new AIGenerationError(
      `No direction fits this profile's hard limits (${dropped.length} dropped). Missing: ${brief.unknowns.join(", ") || "nothing"}.`,
    );

  const attack = await attackCandidates(
    profile,
    brief,
    shortlist.map((s) => s.candidate),
    locale,
  );
  const fatal: EngineTrace["fatal"] = [];
  const surviving: (Scored & { test?: string })[] = [];
  shortlist.forEach((s, i) => {
    const o = attack.objections.find((x) => x.index === i);
    if (o?.fatal) fatal.push({ title: s.candidate.title, objection: o.objection });
    else surviving.push({ ...s, objection: o?.objection, test: o?.test });
  });

  const { chosen, missing } = chooseDirections(surviving, brief);
  if (chosen.length === 0)
    throw new AIGenerationError(
      `Every shortlisted direction had a fatal objection or a weak fit. Missing: ${brief.unknowns.join(", ") || "nothing"}.`,
    );

  const batch = await generateOpportunityPackageBatch(profile, {
    count: chosen.length,
    excludeTitles: [],
    dismissedNotes: [],
    locale,
    seeds: seedsForExpansion(chosen as (Scored & { test?: string })[], profile.identity.currency),
  });
  const opportunities: OpportunityPackage[] = batch.opportunities.slice(0, chosen.length);
  const notes: EngineNotes[] = chosen.slice(0, opportunities.length).map((s) => ({
    promptVersion: ENGINE_PROMPT_VERSION,
    type: s.candidate.type,
    money: {
      ...s.money,
      pricePerUnit: s.candidate.pricePerUnit,
      unit: s.candidate.unit,
      unitsPerMonth: s.candidate.unitsPerMonth,
    },
    evidence: s.evidence,
    objection: s.objection ?? null,
  }));

  return {
    pkg: { founderDNA: wide.founderDNA, opportunities },
    notes,
    trace: {
      promptVersion: ENGINE_PROMPT_VERSION,
      brief,
      generated: wide.candidates.length,
      dropped,
      fatal,
      missing,
      calls: 3,
      ms: Date.now() - started,
    },
  };
}
