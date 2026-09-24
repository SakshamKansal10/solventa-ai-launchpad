import type { NormalizedProfile } from "@/lib/profile/normalize";
import { SKILL_LEVEL_SCORE } from "@/lib/profile/normalize";
import type { OpportunityFitFactors } from "@/lib/profile/scoring";

/**
 * Founder Fit as a QUALITATIVE matrix — four honest rows (Capability,
 * Resources, Access, Ambition), each with a status and one concrete reason
 * computed from what the founder actually told us. There is no radar, no
 * composite number, and no flattery: a gap is named as a gap.
 *
 * Reasons are returned as { code, params } and rendered through the i18n
 * catalogue, so they read in either language.
 */

export type FitStatus = "strong" | "moderate" | "conditional";
export type FitRowKey = "capability" | "resources" | "access" | "ambition";

export interface FitReason {
  code: string;
  params: Record<string, string | number>;
  /** Names to list (skills, resources) — rendered/translated by the UI. */
  lists?: Record<string, string[]>;
}

export interface FitRow {
  key: FitRowKey;
  status: FitStatus;
  reason: FitReason;
}

export interface FitMatrix {
  overall: FitStatus;
  rows: FitRow[];
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function skillCoverage(profile: NormalizedProfile, factors: OpportunityFitFactors) {
  const required = factors.requiredSkills;
  if (required.length === 0)
    return { ratio: 0.7, missing: [] as string[], owned: [] as string[], required: 0 };
  const owned: string[] = [];
  const missing: string[] = [];
  let sum = 0;
  for (const req of required) {
    const have = profile.skills.find(
      (s) => s.name.toLowerCase().trim() === req.name.toLowerCase().trim(),
    );
    if (!have) {
      missing.push(req.name);
      continue;
    }
    const diff = have.levelScore - SKILL_LEVEL_SCORE[req.minLevel];
    const r = diff >= 0 ? 1 : clamp(1 + diff / 3, 0, 1);
    sum += r;
    if (r >= 0.66) owned.push(req.name);
    else missing.push(req.name);
  }
  return { ratio: sum / required.length, missing, owned, required: required.length };
}

function statusFromRatio(ratio: number, strong = 0.75, moderate = 0.4): FitStatus {
  return ratio >= strong ? "strong" : ratio >= moderate ? "moderate" : "conditional";
}

export function computeCapability(profile: NormalizedProfile, f: OpportunityFitFactors): FitRow {
  const cov = skillCoverage(profile, f);
  // Real execution evidence and (for an operator) running something similar
  // lift capability beyond a skill list — never the other way round.
  const executionBoost = Math.min(0.2, (profile.v2?.executionSignals.length ?? 0) * 0.04);
  // A year or less of required experience is not a barrier to entry; only
  // opportunities that genuinely need seasoned experience count it against.
  const experienceRatio =
    f.relevantExperienceYears > 1
      ? clamp(profile.experienceYears / f.relevantExperienceYears, 0, 1)
      : 1;
  const ratio = clamp(cov.ratio * 0.7 + experienceRatio * 0.3 + executionBoost, 0, 1);
  const status = statusFromRatio(ratio);

  if (f.requiredSkills.length === 0) {
    return { key: "capability", status, reason: { code: "cap_no_specific_skills", params: {} } };
  }
  if (cov.missing.length === 0) {
    return {
      key: "capability",
      status,
      reason: { code: "cap_covered", params: { n: cov.required }, lists: { owned: cov.owned } },
    };
  }
  if (cov.owned.length === 0) {
    return {
      key: "capability",
      status,
      reason: {
        code: "cap_gap",
        params: { n: cov.missing.length },
        lists: { missing: cov.missing },
      },
    };
  }
  return {
    key: "capability",
    status,
    reason: {
      code: "cap_partial",
      params: { have: cov.owned.length, need: cov.required },
      lists: { owned: cov.owned, missing: cov.missing },
    },
  };
}

export function computeResources(profile: NormalizedProfile, f: OpportunityFitFactors): FitRow {
  const capital = profile.resources.capitalAmount;
  const capitalRatio =
    f.startupCapitalAmount <= 0 ? 1 : clamp(capital / f.startupCapitalAmount, 0, 1);
  const timeRatio =
    f.weeklyHoursNeeded <= 0 ? 1 : clamp(profile.time.weeklyHours / f.weeklyHoursNeeded, 0, 1);
  const ratio = Math.min(capitalRatio, timeRatio);
  const status: FitStatus = ratio >= 0.95 ? "strong" : ratio >= 0.6 ? "moderate" : "conditional";

  const params = {
    capital,
    capitalNeeded: f.startupCapitalAmount,
    currency: profile.identity.currency,
    hours: profile.time.weeklyHours,
    hoursNeeded: f.weeklyHoursNeeded,
  };
  if (capitalRatio >= 0.95 && timeRatio >= 0.95)
    return { key: "resources", status, reason: { code: "res_ok", params } };
  if (capitalRatio < timeRatio)
    return { key: "resources", status, reason: { code: "res_capital_short", params } };
  return { key: "resources", status, reason: { code: "res_time_short", params } };
}

const HELPS_SELLING = [
  "Existing customer network",
  "Existing audience",
  "Existing business",
  "Industry mentors",
];

export function computeAccess(profile: NormalizedProfile, f: OpportunityFitFactors): FitRow {
  const assets = new Set(
    [...(profile.v2?.access ?? []), ...profile.resources.assets].map((a) => a.toLowerCase()),
  );
  const hasComputer = [...assets].some((a) => a.includes("laptop") || a.includes("computer"));
  const sellingAccess = HELPS_SELLING.filter((a) => assets.has(a.toLowerCase()));

  const met: string[] = [];
  const unmet: string[] = [];
  if (f.requiresDigitalAssets) (hasComputer ? met : unmet).push("computer");
  if (f.requiresSales) (sellingAccess.length > 0 ? met : unmet).push("customers");
  if (!f.locationFlexible) {
    const bound = (profile.constraints.other ?? []).some((c) => /location/i.test(c));
    (bound ? unmet : met).push("location");
  }
  if (f.requiresLeadership && (profile.v2?.execution.roles ?? []).length > 0) {
    (profile.v2!.execution.roles.includes("Leading / hiring") ? met : unmet).push("team");
  }

  const total = met.length + unmet.length;
  if (total === 0) {
    return { key: "access", status: "strong", reason: { code: "acc_no_barrier", params: {} } };
  }
  const ratio = met.length / total;
  const status: FitStatus = ratio === 1 ? "strong" : ratio >= 0.5 ? "moderate" : "conditional";
  if (unmet.length === 0) {
    return {
      key: "access",
      status,
      reason: { code: "acc_covered", params: {}, lists: { access: sellingAccess } },
    };
  }
  return {
    key: "access",
    status,
    reason: { code: "acc_missing", params: {}, lists: { missing: unmet } },
  };
}

const CEILING_RANK = { income: 1, national: 2, venture: 3 } as const;
const AMBITION_WANTS: Record<string, number> = {
  profitable: 1,
  national: 2,
  global: 3,
  expand_existing: 2,
  not_sure: 1,
};
const BAND_WANTS: Record<string, number> = { A: 1, B: 1, C: 2, D: 2, E: 3 };

export function computeAmbition(
  profile: NormalizedProfile,
  f: OpportunityFitFactors,
  band?: string | null,
): FitRow {
  const ceiling = f.ceiling;
  const scaleId = profile.v2?.ambition.scaleId ?? null;
  const wants = scaleId ? (AMBITION_WANTS[scaleId] ?? 1) : band ? (BAND_WANTS[band] ?? 1) : null;

  if (!ceiling || wants === null) {
    return { key: "ambition", status: "moderate", reason: { code: "amb_unknown", params: {} } };
  }
  const have = CEILING_RANK[ceiling];
  if (have >= wants && have <= wants + 1) {
    return {
      key: "ambition",
      status: "strong",
      reason: { code: "amb_match", params: { ceiling: have } },
    };
  }
  if (have > wants + 1) {
    return {
      key: "ambition",
      status: "moderate",
      reason: { code: "amb_bigger", params: { ceiling: have } },
    };
  }
  // The business tops out below what the founder is aiming for.
  return {
    key: "ambition",
    status: have === wants - 1 ? "moderate" : "conditional",
    reason: { code: "amb_smaller", params: { ceiling: have, wants } },
  };
}

export function computeFitMatrix(
  profile: NormalizedProfile,
  factors: OpportunityFitFactors,
  band?: string | null,
  hardConstraintWarnings: number = 0,
): FitMatrix {
  const rows = [
    computeCapability(profile, factors),
    computeResources(profile, factors),
    computeAccess(profile, factors),
    computeAmbition(profile, factors, band),
  ];
  const conditional = rows.filter((r) => r.status === "conditional").length;
  const strong = rows.filter((r) => r.status === "strong").length;
  let overall: FitStatus;
  if (conditional >= 2) overall = "conditional";
  else if (conditional === 1) overall = "moderate";
  else if (strong >= 3 && hardConstraintWarnings === 0) overall = "strong";
  else overall = "moderate";
  return { overall, rows };
}
