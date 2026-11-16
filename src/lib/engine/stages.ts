import { z } from "zod";

import { FitFactorsSchema, type FitFactors } from "@/lib/ai/schemas";
import {
  assessFit,
  fitSortScore,
  statedCapital,
  statedHours,
  type FitAssessment,
  type FitFactorKey,
} from "@/lib/fit/model";
import { getBrackets } from "@/lib/consultation/brackets";
import type { NormalizedProfile } from "@/lib/profile/normalize";

/**
 * The idea engine v2 (redesign-v2 part 5, step 3): the stages that are CODE, not a model —
 * understand, filter on hard limits, score fit with the profile evidence behind each dimension,
 * check the money, and choose. The model stages (generate wide, attack, expand) live in
 * src/lib/ai/prompts/engine-*.ts; the order is in pipeline.server.ts.
 */

// ---------- 1. Understand ----------

export interface EngineBrief {
  strengths: string[];
  /** Hard limits a candidate may not break. Null = unknown (then it does not filter). */
  limits: {
    /** The most a first test may cost: what they could lose, else the low end of their money. */
    maxStartCost: number | null;
    weeklyHours: { min: number; max: number | null } | null;
    age: number | null;
    canTravel: boolean | null;
    refusals: string[];
    monthlyIncomeTarget: number | null;
  };
  unknowns: string[];
}

const TRAVEL_NO = /\b(no|unlikely|limited)\b/i;

export function understand(profile: NormalizedProfile): EngineBrief {
  const v2 = profile.v2;
  const capital = statedCapital(profile);
  const loss = v2?.affordableLoss ?? null;
  const hours = statedHours(profile);
  const unknowns: string[] = [];
  if (profile.skills.length === 0) unknowns.push("skills");
  if (!capital) unknowns.push("money");
  if (!loss && capital && capital.max !== 0) unknowns.push("money they could afford to lose");
  if (!hours) unknowns.push("hours");
  if (v2 && v2.access.length === 0 && !v2.accessNone) unknowns.push("who they can reach");
  if (v2 && !v2.reachThisWeek?.length && !v2.reachNone)
    unknowns.push("customers reachable this week");
  if (profile.identity.age === null) unknowns.push("age");

  const strengths = [
    ...profile.skills.filter((s) => s.levelScore >= 2).map((s) => s.name),
    ...(v2?.executionSignals ?? []),
    ...(v2?.access ?? []),
    ...(v2?.helpAskedFor ? [`asked for help with: ${v2.helpAskedFor}`] : []),
  ].slice(0, 8);

  const relocation = profile.constraints.relocation;
  return {
    strengths,
    limits: {
      maxStartCost: loss ? (loss.max ?? loss.min) : capital ? capital.min : null,
      weeklyHours: hours,
      age: profile.identity.age,
      canTravel: relocation ? !TRAVEL_NO.test(relocation) : null,
      refusals: [...profile.constraints.industryRestrictions, ...(v2?.hardConstraints ?? [])],
      monthlyIncomeTarget: incomeTargetFloor(profile),
    },
    unknowns,
  };
}

/** The low end of the income bracket the founder chose ("at least ₹X a month"), not its
 * midpoint: the target is a floor they need, not a hope. */
function incomeTargetFloor(profile: NormalizedProfile): number | null {
  const value = profile.v2?.ambition.minimumMonthlyIncome ?? null;
  if (value === null) return null;
  const tier = getBrackets("minIncome", profile.identity.currency).find((b) => b.value === value);
  return tier ? (tier.zero ? 0 : (tier.min ?? Math.round(value / 2))) : value;
}

// ---------- 2. Candidates (the shape the wide stage returns) ----------

export const CANDIDATE_TYPES = [
  "service",
  "trading",
  "local_agency",
  "digital",
  "skill_based",
] as const;

export const CandidateSchema = z.object({
  title: z.string().min(3),
  type: z.enum(CANDIDATE_TYPES),
  customer: z.string().describe("Exactly who pays, in this founder's place."),
  problem: z.string(),
  offer: z.string(),
  pricePerUnit: z
    .number()
    .min(0)
    .describe("What one sale or booking is charged, in the founder's currency."),
  unit: z.string().describe("What is sold: 'per booking', 'per month per client', 'per kg'."),
  unitsPerMonth: z.number().min(0).describe("A realistic count in the first three months."),
  marginPercent: z.number().min(0).max(100).describe("What is kept after direct costs."),
  hoursPerUnit: z
    .number()
    .min(0)
    .describe("Founder hours each unit takes, including finding the customer."),
  startCost: z.number().min(0).describe("Money needed before the first sale."),
  needsLicence: z.boolean(),
  minAge: z.number().int().min(0).max(30).nullable(),
  needsTravel: z.boolean(),
  firstTest: z.string().describe("Something done within a week that shows real demand."),
  firstTestCostsMoney: z.boolean(),
  fitSignals: FitFactorsSchema,
});
export type Candidate = z.infer<typeof CandidateSchema>;

export const CandidateListSchema = z.object({
  candidates: z.array(CandidateSchema).min(5).max(30),
});

// ---------- 3. Filter on hard limits ----------

export interface Dropped {
  title: string;
  reason: string;
}

export function filterHardLimits(
  candidates: Candidate[],
  brief: EngineBrief,
): { kept: Candidate[]; dropped: Dropped[] } {
  const kept: Candidate[] = [];
  const dropped: Dropped[] = [];
  const { maxStartCost, weeklyHours, age, canTravel } = brief.limits;
  for (const c of candidates) {
    const reason =
      maxStartCost !== null && c.startCost > maxStartCost
        ? "needs more money than they could afford to lose"
        : weeklyHours?.max != null && c.fitSignals.weeklyHoursNeeded > weeklyHours.max * 1.25
          ? "needs more hours than they have"
          : age !== null && c.minAge !== null && age < c.minAge
            ? "needs an age they do not have"
            : age !== null && age < 18 && c.needsLicence
              ? "needs a licence an under-18 founder cannot hold"
              : canTravel === false && c.needsTravel
                ? "needs travel they cannot do"
                : null;
    if (reason) dropped.push({ title: c.title, reason });
    else kept.push(c);
  }
  return { kept, dropped };
}

// ---------- 4. Fit, with the profile evidence behind each dimension ----------

/** The profile answer each fit dimension relied on; null = nothing to quote = "Not known yet". */
export function fitEvidence(
  profile: NormalizedProfile,
  assessment: FitAssessment,
): Record<FitFactorKey, string | null> {
  const v2 = profile.v2;
  const hours = statedHours(profile);
  const capital = statedCapital(profile);
  const quote: Record<FitFactorKey, string | null> = {
    access: v2
      ? v2.access.length
        ? `access: ${v2.access.join(", ")}`
        : v2.accessNone
          ? "access: none of these"
          : null
      : profile.resources.assets.length
        ? `assets: ${profile.resources.assets.join(", ")}`
        : null,
    resources: capital
      ? `money: ${capital.min}${capital.max === null ? "+" : capital.max !== capital.min ? `–${capital.max}` : ""} ${profile.identity.currency}`
      : null,
    capability: profile.skills.length
      ? `skills: ${profile.skills.map((s) => `${s.name} (${s.declaredLevel ?? s.level})`).join(", ")}`
      : null,
    time: hours ? `hours a week: ${hours.min}${hours.max === null ? "+" : `–${hours.max}`}` : null,
    goals:
      v2?.ambition.scale || profile.risk?.appetite
        ? `goal: ${v2?.ambition.scale ?? "—"}; risk: ${profile.risk?.appetite ?? "—"}`
        : null,
  };
  // A dimension the assessment could not score has nothing behind it, whatever was answered.
  for (const f of assessment.factors) if (f.score === null) quote[f.key] = null;
  return quote;
}

// ---------- 5. Money, checked in code ----------

export interface MoneyCheck {
  monthlyRevenue: number;
  monthlyProfit: number;
  weeklyHours: number;
  /** Units a month, and founder hours a week, that the income target needs at this price and
   * margin (null without a target). */
  unitsForTarget: number | null;
  hoursForTarget: number | null;
  /** Can the target be reached within their hours at these numbers? */
  meetsTarget: boolean | null;
  fitsHours: boolean | null;
  verdict: "ok" | "below_target" | "over_hours" | "unknown_target";
}

const WEEKS_PER_MONTH = 4.33;

export function checkMoney(c: Candidate, brief: EngineBrief): MoneyCheck {
  const monthlyRevenue = Math.round(c.pricePerUnit * c.unitsPerMonth);
  const monthlyProfit = Math.round((monthlyRevenue * c.marginPercent) / 100);
  const weeklyHours = Math.round(((c.unitsPerMonth * c.hoursPerUnit) / WEEKS_PER_MONTH) * 10) / 10;
  const target = brief.limits.monthlyIncomeTarget;
  const cap = brief.limits.weeklyHours?.max ?? null;
  const profitPerUnit = (c.pricePerUnit * c.marginPercent) / 100;
  // "Do the numbers reach the target within their hours?" — not "in the first months".
  const unitsForTarget =
    target === null || target <= 0
      ? null
      : profitPerUnit > 0
        ? Math.ceil(target / profitPerUnit)
        : Infinity;
  const hoursForTarget =
    unitsForTarget === null
      ? null
      : Math.round(((unitsForTarget * c.hoursPerUnit) / WEEKS_PER_MONTH) * 10) / 10;
  const meetsTarget =
    hoursForTarget === null
      ? null
      : Number.isFinite(hoursForTarget) && (cap === null || hoursForTarget <= cap * 1.25);
  const fitsHours = cap === null ? null : weeklyHours <= cap * 1.25;
  const verdict =
    fitsHours === false
      ? "over_hours"
      : meetsTarget === false
        ? "below_target"
        : meetsTarget === null
          ? "unknown_target"
          : "ok";
  return {
    monthlyRevenue,
    monthlyProfit,
    weeklyHours,
    unitsForTarget:
      unitsForTarget !== null && Number.isFinite(unitsForTarget) ? unitsForTarget : null,
    hoursForTarget:
      hoursForTarget !== null && Number.isFinite(hoursForTarget) ? hoursForTarget : null,
    meetsTarget,
    fitsHours,
    verdict,
  };
}

// ---------- 6. Score and choose ----------

export interface Scored {
  candidate: Candidate;
  fit: FitAssessment;
  money: MoneyCheck;
  evidence: Record<FitFactorKey, string | null>;
  objection?: string;
}

export function scoreCandidates(
  profile: NormalizedProfile,
  brief: EngineBrief,
  list: Candidate[],
): Scored[] {
  return list
    .map((candidate) => {
      const fit = assessFit(profile, candidate.fitSignals as FitFactors);
      return {
        candidate,
        fit,
        money: checkMoney(candidate, brief),
        evidence: fitEvidence(profile, fit),
      };
    })
    .sort((a, b) => rank(b) - rank(a));
}

/** Fit first; numbers that do not work for this person push a direction down. */
const rank = (s: Scored) =>
  fitSortScore(s.fit) -
  (s.money.verdict === "over_hours" ? 60 : s.money.verdict === "below_target" ? 25 : 0);

/**
 * Up to three directions, different from each other (one per type while another type is
 * available), never a weak fit or broken numbers to fill a slot. Fewer than three is an honest
 * answer; `missing` then says what would sharpen the result.
 */
export function chooseDirections(
  scored: Scored[],
  brief: EngineBrief,
  n = 3,
): { chosen: Scored[]; missing: string[] } {
  const eligible = scored.filter((s) => s.fit.label !== "weak" && s.money.verdict !== "over_hours");
  const chosen: Scored[] = [];
  const types = new Set<string>();
  for (const s of eligible) {
    if (chosen.length >= n) break;
    if (types.has(s.candidate.type)) continue;
    chosen.push(s);
    types.add(s.candidate.type);
  }
  for (const s of eligible) {
    if (chosen.length >= n) break;
    if (!chosen.includes(s)) chosen.push(s);
  }
  return { chosen, missing: chosen.length < n ? brief.unknowns : [] };
}
