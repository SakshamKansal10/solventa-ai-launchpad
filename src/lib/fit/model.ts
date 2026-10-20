import { getBrackets } from "@/lib/consultation/brackets";
import { enLabel } from "@/lib/profile/normalize-v2";
import type { NormalizedProfile } from "@/lib/profile/normalize";
import { SKILL_LEVEL_SCORE } from "@/lib/profile/normalize";
import type { FitFactors } from "@/lib/ai/schemas";

/**
 * THE founder-fit assessment — the one function every screen, list, email and
 * notification reads a fit label from. Pure and deterministic over two stored
 * inputs (the consultation's normalized profile snapshot and the direction's
 * fit signals), so the same direction can never carry two different labels.
 *
 * Five factors, each scored 0–3 or `null` when the founder has not told us
 * enough (unknown is never a zero, and never a reward):
 *   0 critical mismatch · 1 significant gap · 2 manageable gap · 3 clear fit
 *
 * The overall score is the weighted mean over the factors that could be
 * assessed; coverage (the share of weight assessed) is tracked separately and
 * gates the label. Founder fit says nothing about market demand — that is
 * validation, kept apart on purpose.
 */

export const FIT_RUBRIC_VERSION = "fit-v2-2026-10";

export type FitFactorKey = "access" | "resources" | "capability" | "time" | "goals";
export type FactorScore = 0 | 1 | 2 | 3 | null;
export type FitLabel = "strong" | "moderate" | "conditional" | "weak" | "provisional";

/** Order every screen shows the factors in, with their weights (sum 100). */
export const FIT_FACTORS: { key: FitFactorKey; weight: number }[] = [
  { key: "access", weight: 25 },
  { key: "resources", weight: 25 },
  { key: "capability", weight: 20 },
  { key: "time", weight: 20 },
  { key: "goals", weight: 10 },
];

/** A reason rendered through the i18n catalogue (`fit2.<code>`) with its values. */
export interface FitReason {
  code: string;
  params: Record<string, string | number>;
  lists?: Record<string, string[]>;
}

export interface FactorAssessment {
  key: FitFactorKey;
  weight: number;
  score: FactorScore;
  reason: FitReason;
}

export interface FitAssessment {
  rubricVersion: typeof FIT_RUBRIC_VERSION;
  label: FitLabel;
  /** 0–100 over the assessed factors; null when nothing could be assessed. Internal only. */
  score: number | null;
  /** Share of the total weight that could be assessed, 0–1. */
  coverage: number;
  factors: FactorAssessment[];
  /** Factors scored 0 — any one of them rules out Strong. */
  blockers: FitFactorKey[];
  /** Factors still unknown — what to ask the founder next. */
  unknown: FitFactorKey[];
}

const BANDS = { strong: 80, moderate: 65, conditional: 45 } as const;
const MIN_COVERAGE = 0.8;

// ---------- the founder's stated values, kept as RANGES ----------

export interface Range {
  min: number;
  /** null = open-ended ("40+ hrs", "More than ₹5 lakh"). */
  max: number | null;
}

const HOURS_BY_LABEL: Record<string, Range> = {
  "Under 5 hrs": { min: 0, max: 5 },
  "5–10 hrs": { min: 5, max: 10 },
  "10–20 hrs": { min: 10, max: 20 },
  "20–30 hrs": { min: 20, max: 30 },
  "30–40 hrs": { min: 30, max: 40 },
  "40+ hrs": { min: 40, max: null },
  // Pre-v2 consultations.
  "20+ hrs": { min: 20, max: null },
  "Full-time": { min: 40, max: null },
};

/** Stated weekly hours as the range the founder picked, or null when never answered. */
export function statedHours(profile: NormalizedProfile): Range | null {
  if (profile.time.weeklyHoursRange) return profile.time.weeklyHoursRange;
  const label = profile.time.weeklyHoursBracket;
  return label ? (HOURS_BY_LABEL[label] ?? null) : null;
}

/** Stated starting capital as a range in the founder's currency, or null when never answered. */
export function statedCapital(profile: NormalizedProfile): Range | null {
  const tier = profile.v2?.capitalTier;
  if (typeof tier === "number") {
    const tiers = getBrackets("capital", profile.identity.currency);
    const b = tiers[tier];
    if (!b) return null;
    // A precise amount given for the top tier is the founder's own number.
    if (tier === tiers.length - 1 && profile.resources.capitalAmount !== b.value)
      return { min: profile.resources.capitalAmount, max: profile.resources.capitalAmount };
    return { min: b.min ?? 0, max: b.max };
  }
  // Pre-v2 consultations stored one representative amount next to the label.
  if (profile.resources.capitalBracket)
    return { min: profile.resources.capitalAmount, max: profile.resources.capitalAmount };
  return null;
}

// ---------- factors ----------

const SELLING_ACCESS = ["customer_network", "audience", "existing_business", "mentors"] as const;
const label = (group: string, id: string) => enLabel(group, id) ?? id;

function accessList(profile: NormalizedProfile): string[] | null {
  if (profile.v2) {
    if (profile.v2.access.length > 0) return profile.v2.access;
    // "None of these" is an answer; an empty list from an older consultation is not.
    return profile.v2.accessNone ? [] : null;
  }
  return profile.resources.assets.length > 0 ? profile.resources.assets : null;
}

function assessAccess(profile: NormalizedProfile, f: FitFactors): FactorAssessment {
  const base = { key: "access" as const, weight: 25 };
  const list = accessList(profile);
  if (list === null) return { ...base, score: null, reason: { code: "access_unknown", params: {} } };
  const have = SELLING_ACCESS.map((id) => label("access", id)).filter((l) => list.includes(l));
  if (have.length > 0)
    return {
      ...base,
      // Having a network is not proof it holds THIS direction's buyers — confirming that is the test.
      score: f.requiresSales ? 2 : 3,
      reason: { code: f.requiresSales ? "access_network_confirm" : "access_network", params: {}, lists: { have } },
    };
  return {
    ...base,
    score: f.requiresSales ? 1 : 2,
    reason: { code: f.requiresSales ? "access_none_sales" : "access_none", params: {} },
  };
}

function assessResources(profile: NormalizedProfile, f: FitFactors): FactorAssessment {
  const base = { key: "resources" as const, weight: 25 };
  const cap = statedCapital(profile);
  const currency = profile.identity.currency;
  if (!cap) return { ...base, score: null, reason: { code: "res_unknown", params: {} } };
  const need = f.startupCapitalAmount;
  const params = { min: cap.min, max: cap.max ?? -1, need, currency };
  let score: Exclude<FactorScore, null>;
  let code: string;
  if (need <= 0) [score, code] = [3, "res_no_capital_needed"];
  else if (need <= cap.min) [score, code] = [3, "res_within_lower"];
  else if (cap.max === null) [score, code] = need <= cap.min * 2 ? [2, "res_within_range"] : [1, "res_above"];
  else if (need <= cap.max) [score, code] = [2, "res_within_range"];
  else if (cap.max === 0) {
    // No money set aside: a small first test is a gap; a large one is a blocker.
    const smallest = getBrackets("capital", currency).find((b) => !b.zero)?.max ?? 0;
    [score, code] = need <= smallest ? [1, "res_none_small_need"] : [0, "res_none_large_need"];
  } else [score, code] = need <= cap.max * 2 ? [1, "res_above"] : [0, "res_far_above"];

  // A computer the direction needs, when the founder told us what they have.
  if (f.requiresDigitalAssets) {
    const list = accessList(profile);
    const computer = list?.some((a) => /laptop|computer/i.test(a));
    if (list !== null && !computer && score > 1) [score, code] = [1, "res_no_computer"];
  }
  return { ...base, score, reason: { code, params } };
}

function assessCapability(profile: NormalizedProfile, f: FitFactors): FactorAssessment {
  const base = { key: "capability" as const, weight: 20 };
  // Skills are optional in the consultation: none recorded means unknown, never "lacks".
  if (profile.skills.length === 0)
    return { ...base, score: null, reason: { code: "cap_unknown", params: {} } };
  const required = f.requiredSkills;
  if (required.length === 0)
    return { ...base, score: 2, reason: { code: "cap_none_required", params: {} } };
  const owned: string[] = [];
  const missing: string[] = [];
  let sum = 0;
  for (const req of required) {
    const have = profile.skills.find(
      (s) => s.name.toLowerCase().trim() === req.name.toLowerCase().trim(),
    );
    const r = have
      ? Math.min(1, Math.max(0, 1 + (have.levelScore - SKILL_LEVEL_SCORE[req.minLevel]) / 3))
      : 0;
    sum += r;
    (r >= 0.66 ? owned : missing).push(req.name);
  }
  const ratio = sum / required.length;
  let score: Exclude<FactorScore, null> = ratio >= 0.99 ? 3 : ratio >= 0.5 ? 2 : 1;
  // Things the founder has actually done lift a partial match by one step.
  if (score === 2 && (profile.v2?.executionSignals.length ?? 0) >= 2) score = 3;
  const code = missing.length === 0 ? "cap_covered" : owned.length === 0 ? "cap_gap" : "cap_partial";
  return {
    ...base,
    score,
    reason: { code, params: { have: owned.length, need: required.length }, lists: { owned, missing } },
  };
}

function assessTime(profile: NormalizedProfile, f: FitFactors): FactorAssessment {
  const base = { key: "time" as const, weight: 20 };
  const hours = statedHours(profile);
  if (!hours) return { ...base, score: null, reason: { code: "time_unknown", params: {} } };
  const need = f.weeklyHoursNeeded;
  const params = { min: hours.min, max: hours.max ?? -1, need };
  let score: Exclude<FactorScore, null>;
  let code: string;
  if (need <= Math.max(hours.min, 0)) [score, code] = [3, "time_within_lower"];
  else if (hours.max === null || need <= hours.max) [score, code] = [2, "time_within_range"];
  else if (need <= hours.max * 2) [score, code] = [1, "time_above"];
  else [score, code] = [0, "time_far_above"];

  const constraints = profile.v2?.hardConstraints ?? [];
  const bound = [label("constraints", "location_bound"), label("constraints", "limited_travel")];
  if (!f.locationFlexible && constraints.some((c) => bound.includes(c)) && score > 1)
    [score, code] = [1, "time_location_conflict"];
  return { ...base, score, reason: { code, params } };
}

const CEILING_RANK = { income: 1, national: 2, venture: 3 } as const;
const AMBITION_WANTS: Record<string, number> = {
  profitable: 1,
  national: 2,
  global: 3,
  expand_existing: 2,
};

function assessGoals(profile: NormalizedProfile, f: FitFactors): FactorAssessment {
  const base = { key: "goals" as const, weight: 10 };
  const scaleId = profile.v2?.ambition.scaleId ?? null;
  // "Not sure yet" is an honest answer — it is not a match with anything.
  const wants = scaleId && scaleId !== "not_sure" ? (AMBITION_WANTS[scaleId] ?? null) : null;
  const risk = profile.risk?.appetite ?? null;
  const riskMismatch = risk === "cautious" && f.riskLevel === "experimental";

  if (wants === null || !f.ceiling) {
    if (risk === null) return { ...base, score: null, reason: { code: "goals_unknown", params: {} } };
    // Only the risk side is known: at most a manageable match.
    return {
      ...base,
      score: riskMismatch ? 1 : 2,
      reason: { code: riskMismatch ? "goals_risk_mismatch" : "goals_ambition_open", params: {} },
    };
  }
  const have = CEILING_RANK[f.ceiling];
  let score: Exclude<FactorScore, null>;
  let code: string;
  if (have >= wants && have <= wants + 1) [score, code] = [3, "goals_match"];
  else if (have > wants + 1) [score, code] = [2, "goals_bigger"];
  else if (have === wants - 1) [score, code] = [2, "goals_smaller"];
  else [score, code] = [1, "goals_much_smaller"];
  if (riskMismatch && score > 1) [score, code] = [(score - 1) as 1 | 2, "goals_risk_mismatch"];
  return { ...base, score, reason: { code, params: { ceiling: have, wants } } };
}

// ---------- the assessment ----------

export function assessFit(profile: NormalizedProfile, signals: FitFactors): FitAssessment {
  const factors = [
    assessAccess(profile, signals),
    assessResources(profile, signals),
    assessCapability(profile, signals),
    assessTime(profile, signals),
    assessGoals(profile, signals),
  ];
  const known = factors.filter((x) => x.score !== null);
  const knownWeight = known.reduce((s, x) => s + x.weight, 0);
  const coverage = knownWeight / 100;
  const score =
    knownWeight === 0
      ? null
      : Math.round(
          (known.reduce((s, x) => s + ((x.score as number) / 3) * x.weight, 0) / knownWeight) * 100,
        );
  const blockers = factors.filter((x) => x.score === 0).map((x) => x.key);
  const unknown = factors.filter((x) => x.score === null).map((x) => x.key);
  return {
    rubricVersion: FIT_RUBRIC_VERSION,
    label: labelFor(score, coverage, blockers, unknown),
    score,
    coverage,
    factors,
    blockers,
    unknown,
  };
}

function labelFor(
  score: number | null,
  coverage: number,
  blockers: FitFactorKey[],
  unknown: FitFactorKey[],
): FitLabel {
  if (score === null || coverage < MIN_COVERAGE) return "provisional";
  let band: FitLabel =
    score >= BANDS.strong
      ? "strong"
      : score >= BANDS.moderate
        ? "moderate"
        : score >= BANDS.conditional
          ? "conditional"
          : "weak";
  // Strong needs both customer access and resources known, and nothing ruled out.
  const essentialsKnown = !unknown.includes("access") && !unknown.includes("resources");
  if (band === "strong" && (blockers.length > 0 || !essentialsKnown)) band = "moderate";
  return band;
}

/** Sort key for ordering directions by fit: assessed score, provisional last. */
export function fitSortScore(a: FitAssessment): number {
  return a.label === "provisional" ? -1 : (a.score ?? -1);
}
