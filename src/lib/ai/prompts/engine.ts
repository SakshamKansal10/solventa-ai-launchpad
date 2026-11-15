import { z } from "zod";

import { generateJSON } from "@/lib/ai/gemini.server";
import { FounderDNASchema } from "@/lib/ai/schemas";
import type { Candidate, EngineBrief } from "@/lib/engine/stages";
import { CandidateSchema, CANDIDATE_TYPES } from "@/lib/engine/stages";
import type { NormalizedProfile } from "@/lib/profile/normalize";

import { buildLanguageRule, formatProfileForPrompt, type GenerationLocale } from "./shared";

/**
 * The idea engine v2's model stages (redesign-v2 part 5, step 3). Versioned: change the version
 * whenever a prompt changes, so stored results stay comparable (`npm run engine:compare`).
 */
export const ENGINE_PROMPT_VERSION = "engine-v2-2026-11-15";

const PLAIN = `Plain words a 16-year-old understands. No hype, no jargon. Every number is an estimate the founder's first weeks will check — never present one as known.`;

function formatBrief(brief: EngineBrief, currency: string): string {
  const l = brief.limits;
  return [
    `Strengths: ${brief.strengths.join("; ") || "none recorded"}.`,
    `Hard limits — a direction that breaks one is useless to this person:`,
    `- most a first test may cost: ${l.maxStartCost === null ? "UNKNOWN (keep it free or near-free)" : `${l.maxStartCost} ${currency}`}`,
    `- hours a week: ${l.weeklyHours ? `${l.weeklyHours.min}${l.weeklyHours.max === null ? "+" : `–${l.weeklyHours.max}`}` : "UNKNOWN"}`,
    `- age: ${l.age ?? "UNKNOWN"}${l.age !== null && l.age < 18 ? " (under 18: no licences, no contracts in their own name)" : ""}`,
    `- can travel: ${l.canTravel === null ? "UNKNOWN" : l.canTravel ? "yes" : "no"}`,
    `- will not do: ${l.refusals.join("; ") || "nothing stated"}`,
    `- income needed per month: ${l.monthlyIncomeTarget === null ? "not stated" : `${l.monthlyIncomeTarget} ${currency}`}`,
    `Unknown (never guess these): ${brief.unknowns.join(", ") || "nothing"}.`,
  ].join("\n");
}

// ---------- generate wide ----------

const WideSchema = z.object({
  founderDNA: FounderDNASchema,
  candidates: CandidateSchema.array().min(12).max(30),
});
export type WideResult = z.infer<typeof WideSchema>;

const WIDE_SYSTEM = `You are Sol, Solventia's opportunity scout for first-time founders in India and beyond. You think like a careful local adviser, not a trend report. ${PLAIN}`;

export async function generateCandidates(
  profile: NormalizedProfile,
  brief: EngineBrief,
  locale: GenerationLocale = "en",
): Promise<WideResult> {
  const place =
    [profile.identity.city, profile.identity.state].filter(Boolean).join(", ") || "their area";
  const prompt = `Founder profile:
${formatProfileForPrompt(profile)}

${formatBrief(brief, profile.identity.currency)}

1. founderDNA — a short, honest synthesis of this person (not a restatement of every answer).

2. candidates — 24 business directions this person could start testing NEXT WEEK in ${place}, spread across these types, at least 4 of each: ${CANDIDATE_TYPES.join(", ")}. Not variations of one idea. Each one:
- customer: who exactly pays, in ${place} (or reachable from it); problem; offer.
- the money as estimates: pricePerUnit and unit, unitsPerMonth realistic for the first three months, marginPercent, hoursPerUnit (including finding the customer), startCost before the first sale — in ${profile.identity.currency}.
- needsLicence, minAge (null if none), needsTravel.
- firstTest: one concrete action inside a week that shows real demand (people agreeing to pay, book or pre-order — never compliments), and firstTestCostsMoney.
- fitSignals: what the direction really requires (skills with level, startupCapitalAmount = startCost, weeklyHoursNeeded, risk, sales, digital assets, location flexibility, realistic ceiling).
Respect every hard limit. Where something is UNKNOWN, choose directions that work either way rather than guessing it.

Respond with ONLY a JSON object: { "founderDNA": {...}, "candidates": [ ... ] }.${buildLanguageRule(locale)}`;
  return generateJSON(WideSchema, {
    systemInstruction: WIDE_SYSTEM,
    prompt,
    callSite: "engine.generateCandidates",
    purpose: "ENGINE_WIDE",
    route: "consultation/complete",
  });
}

// ---------- attack ----------

const AttackSchema = z.object({
  objections: z
    .array(
      z.object({
        index: z.number().int().min(0),
        objection: z.string().describe("The strongest reason it would fail for THIS person, here."),
        fatal: z
          .boolean()
          .describe("True only if it cannot work for them at all — not merely hard."),
        test: z
          .string()
          .describe("The cheapest action within a week that shows whether the objection holds."),
      }),
    )
    .min(1),
});
export type AttackResult = z.infer<typeof AttackSchema>;

const ATTACK_SYSTEM = `You are a sceptical, fair investor and local operator. Your job is to find why each direction would fail for this specific person in this specific place — the market, the customer's habits, the founder's limits, the money. ${PLAIN}`;

export async function attackCandidates(
  profile: NormalizedProfile,
  brief: EngineBrief,
  list: Candidate[],
  locale: GenerationLocale = "en",
): Promise<AttackResult> {
  const rows = list
    .map(
      (c, i) =>
        `${i}. ${c.title} — customer: ${c.customer}; offer: ${c.offer}; ${c.pricePerUnit} ${profile.identity.currency} ${c.unit}, ~${c.unitsPerMonth}/month, ${c.marginPercent}% kept, ${c.hoursPerUnit} h each, start cost ${c.startCost}; first test: ${c.firstTest}`,
    )
    .join("\n");
  const prompt = `Founder profile:
${formatProfileForPrompt(profile)}

${formatBrief(brief, profile.identity.currency)}

Directions to attack:
${rows}

For EVERY direction (index as above): the strongest objection, whether it is fatal for this person, and the cheapest test that would show if the objection holds. Do not soften: an honest "this fails because…" saves the founder months.

Respond with ONLY a JSON object: { "objections": [ { "index": number, "objection": string, "fatal": boolean, "test": string } ] }.${buildLanguageRule(locale)}`;
  return generateJSON(AttackSchema, {
    systemInstruction: ATTACK_SYSTEM,
    prompt,
    callSite: "engine.attackCandidates",
    purpose: "ENGINE_ATTACK",
    route: "consultation/complete",
  });
}

/** The chosen directions as a brief for the expansion stage (the existing direction writer). */
export function seedsForExpansion(
  chosen: { candidate: Candidate; objection?: string; test?: string }[],
  currency: string,
): string {
  return chosen
    .map(
      ({ candidate: c, objection, test }, i) =>
        `${i}. "${c.title}" (${c.type}) — customer: ${c.customer}; problem: ${c.problem}; offer: ${c.offer}; money (estimates): ${c.pricePerUnit} ${currency} ${c.unit}, about ${c.unitsPerMonth} a month, ${c.marginPercent}% kept; start cost ${c.startCost} ${currency}; first test (under a week): ${test ?? c.firstTest}.${objection ? ` The strongest objection — make it the FIRST critical assumption and the first test: ${objection}` : ""}`,
    )
    .join("\n");
}
